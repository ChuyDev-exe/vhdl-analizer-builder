library IEEE;
use IEEE.STD_LOGIC_1164.ALL;

entity contador is
  port (
    a   : in  STD_LOGIC;
    b   : in  STD_LOGIC;
    clk : in  STD_LOGIC;
    y   : out STD_LOGIC;   -- combinacional: a XOR b
    q   : out STD_LOGIC    -- registrado: captura y en el flanco de subida
  );
end contador;

architecture rtl of contador is
  signal y_comb : STD_LOGIC;
  signal q_reg  : STD_LOGIC;
begin
  -- lógica combinacional
  y_comb <= a xor b;

  -- flip-flop tipo D
  process(clk)
  begin
    if rising_edge(clk) then
      q_reg <= y_comb;
    end if;
  end process;

  y <= y_comb;
  q <= q_reg;
end rtl;
