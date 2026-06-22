// SPDX-License-Identifier: MIT
/* Cloud persistence of circuits and projects via Supabase.
   Falls back gracefully when Supabase is not configured. */
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type { ProjectData, ProjectMeta } from "../projects";

const CLOUD_PROJECTS_TABLE = "projects";

interface CloudProject {
  id?: string;
  user_id: string;
  name: string;
  data: ProjectData;
  desc?: string;
  tags?: string[];
  ver?: number;
  created_at?: string;
  updated_at?: string;
}

export async function listCloudProjects(userId: string): Promise<ProjectMeta[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  const { data, error } = await supabase!
    .from(CLOUD_PROJECTS_TABLE)
    .select("name, data, desc, tags, ver, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing cloud projects:", error);
    return [];
  }

  return (data || []).map((p: any) => ({
    name: p.name,
    ts: new Date(p.updated_at || Date.now()).getTime(),
    count: (p.data?.nodes || []).length,
    desc: p.desc,
    tags: p.tags,
    ver: p.ver,
    cloud: true,
  }));
}

export async function saveCloudProject(userId: string, name: string, data: ProjectData): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  data.ver = (data.ver || 0) + 1;
  const { error } = await supabase!
    .from(CLOUD_PROJECTS_TABLE)
    .upsert(
      {
        user_id: userId,
        name,
        data,
        desc: data.desc,
        tags: data.tags,
        ver: data.ver,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,name" }
    );
  if (error) console.error("Error saving cloud project:", error);
}

export async function loadCloudProject(userId: string, name: string): Promise<ProjectData | null> {
  if (!isSupabaseConfigured() || !userId) return null;
  const { data, error } = await supabase!
    .from(CLOUD_PROJECTS_TABLE)
    .select("data")
    .eq("user_id", userId)
    .eq("name", name)
    .single();
  if (error || !data) return null;
  return (data as any).data;
}

export async function deleteCloudProject(userId: string, name: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  const { error } = await supabase!
    .from(CLOUD_PROJECTS_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("name", name);
  if (error) console.error("Error deleting cloud project:", error);
}

export async function syncProjectToCloud(userId: string, name: string, data: ProjectData): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  try {
    await saveCloudProject(userId, name, data);
  } catch (e) {
    console.error("Sync error:", e);
  }
}

export async function exportUserData(userId: string): Promise<any> {
  const projects = await listCloudProjects(userId);
  const full: any[] = [];
  for (const p of projects) {
    const data = await loadCloudProject(userId, p.name);
    if (data) full.push({ name: p.name, data, desc: p.desc, tags: p.tags });
  }
  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    projects: full,
  };
}
