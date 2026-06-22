export type PlanId = "free" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  nameEs: string;
  price: number;
  priceAnnual: number;
  currency: string;
  description: string;
  descriptionEs: string;
  badge?: string;
  popular?: boolean;
  features: PlanFeatures;
}

export interface PlanFeatures {
  cloudProjects: number | "unlimited";
  componentsPerProject: number | "unlimited";
  collaborators: number;
  collaboratorPermission: "none" | "view" | "edit";
  versionHistoryDays: number;
  shareLinkView: boolean;
  shareLinkEdit: boolean;
  exportPNG: boolean;
  exportSVG: boolean;
  exportWatermark: boolean;
  exportVCD: boolean;
  exportCSV: boolean;
  exportJSON: boolean;
  exportPDF: boolean;
  githubIntegration: boolean;
  gitlabIntegration: boolean;
  vhdlEditor: boolean;
  vhdlAutocomplete: boolean;
  visualDiff: boolean;
  realtimeCollab: boolean;
  collaboratorCursors: boolean;
  nodeComments: boolean;
  roles: boolean;
  sso: boolean;
  auditLog: boolean;
  apiRequestsPerDay: number | "unlimited";
  cloudStorageMB: number;
  remoteSimulationsPerMonth: number | "unlimited";
  supportLevel: "community" | "email48h" | "email24h_chat" | "priority4h_chat_phone";
  trialDays: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    nameEs: "Gratis",
    price: 0,
    priceAnnual: 0,
    currency: "USD",
    description: "Perfecto para empezar",
    descriptionEs: "Perfecto para empezar",
    features: {
      cloudProjects: 1,
      componentsPerProject: 25,
      collaborators: 0,
      collaboratorPermission: "none",
      versionHistoryDays: 0,
      shareLinkView: true,
      shareLinkEdit: false,
      exportPNG: false,
      exportSVG: false,
      exportWatermark: true,
      exportVCD: false,
      exportCSV: false,
      exportJSON: true,
      exportPDF: false,
      githubIntegration: true,
      gitlabIntegration: true,
      vhdlEditor: false,
      vhdlAutocomplete: false,
      visualDiff: false,
      realtimeCollab: false,
      collaboratorCursors: false,
      nodeComments: false,
      roles: false,
      sso: false,
      auditLog: false,
      apiRequestsPerDay: 0,
      cloudStorageMB: 5,
      remoteSimulationsPerMonth: 0,
      supportLevel: "community",
      trialDays: 0,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    nameEs: "Pro",
    price: 12,
    priceAnnual: 115,
    currency: "USD",
    description: "Para profesionales individuales",
    descriptionEs: "Para profesionales individuales",
    popular: true,
    badge: "Popular",
    features: {
      cloudProjects: 50,
      componentsPerProject: "unlimited",
      collaborators: 3,
      collaboratorPermission: "edit",
      versionHistoryDays: 30,
      shareLinkView: true,
      shareLinkEdit: true,
      exportPNG: true,
      exportSVG: true,
      exportWatermark: false,
      exportVCD: true,
      exportCSV: true,
      exportJSON: true,
      exportPDF: true,
      githubIntegration: true,
      gitlabIntegration: true,
      vhdlEditor: true,
      vhdlAutocomplete: true,
      visualDiff: true,
      realtimeCollab: false,
      collaboratorCursors: false,
      nodeComments: false,
      roles: false,
      sso: false,
      auditLog: false,
      apiRequestsPerDay: 1000,
      cloudStorageMB: 1024,
      remoteSimulationsPerMonth: 1000,
      supportLevel: "email48h",
      trialDays: 14,
    },
  },
  team: {
    id: "team",
    name: "Team",
    nameEs: "Team",
    price: 79,
    priceAnnual: 758,
    currency: "USD",
    description: "Para equipos y organizaciones",
    descriptionEs: "Para equipos y organizaciones",
    badge: "Equipos",
    features: {
      cloudProjects: "unlimited",
      componentsPerProject: "unlimited",
      collaborators: "unlimited" as unknown as number,
      collaboratorPermission: "edit",
      versionHistoryDays: 365,
      shareLinkView: true,
      shareLinkEdit: true,
      exportPNG: true,
      exportSVG: true,
      exportWatermark: false,
      exportVCD: true,
      exportCSV: true,
      exportJSON: true,
      exportPDF: true,
      githubIntegration: true,
      gitlabIntegration: true,
      vhdlEditor: true,
      vhdlAutocomplete: true,
      visualDiff: true,
      realtimeCollab: true,
      collaboratorCursors: true,
      nodeComments: true,
      roles: true,
      sso: true,
      auditLog: true,
      apiRequestsPerDay: "unlimited",
      cloudStorageMB: 51200,
      remoteSimulationsPerMonth: "unlimited",
      supportLevel: "priority4h_chat_phone",
      trialDays: 0,
    },
  },
};

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function getStorageLimitMB(plan: PlanId): number {
  return PLANS[plan].features.cloudStorageMB;
}

export function getProjectLimit(plan: PlanId): number | "unlimited" {
  return PLANS[plan].features.cloudProjects;
}

export function getComponentLimit(plan: PlanId): number | "unlimited" {
  return PLANS[plan].features.componentsPerProject;
}
