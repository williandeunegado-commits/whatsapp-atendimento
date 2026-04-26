import { describe, it, expect, vi, beforeEach } from 'vitest';

// Simula o comportamento do SELECT FOR UPDATE + version check
async function attemptAssign(
  currentVersion: number,
  currentStatus: string,
  expectedVersion: number,
  userId: string,
): Promise<{ won: boolean; error?: string }> {
  // Simula a transação com SELECT FOR UPDATE
  if (currentStatus !== 'pending') {
    return { won: false, error: 'Conversa não está pendente' };
  }
  if (currentVersion !== expectedVersion) {
    return { won: false, error: 'Conversa já foi atribuída por outro atendente' };
  }
  // Ganha a corrida
  return { won: true };
}

describe('Corrida de Atribuição — Lock Otimista', () => {
  it('primeiro atendente ganha, segundo recebe 409', async () => {
    // Estado inicial: conversa pendente com version=0
    let currentVersion = 0;
    let currentStatus = 'pending';

    // Atendente A: chega primeiro, lê version=0
    const attemptA = await attemptAssign(currentVersion, currentStatus, 0, 'user-a');
    expect(attemptA.won).toBe(true);

    // Simula update após A ganhar
    currentVersion = 1;
    currentStatus = 'open';

    // Atendente B: também leu version=0, mas chega depois
    // Após A ganhar: status='open', version=1 — B falha por status OU version
    const attemptB = await attemptAssign(currentVersion, currentStatus, 0, 'user-b');
    expect(attemptB.won).toBe(false);
    // A corrida é detectada por status !== 'pending' (já está 'open')
    expect(attemptB.error).toBeTruthy(); // qualquer erro de conflito é válido
  });

  it('atribuição simultânea: apenas um ganha', async () => {
    let currentVersion = 0;
    let currentStatus = 'pending';
    let winner: string | null = null;
    let losers: string[] = [];

    const users = ['user-a', 'user-b', 'user-c'];

    // Simula 3 atendentes tentando ao mesmo tempo com a mesma expectedVersion
    const results = await Promise.all(
      users.map(async (userId) => {
        // Todos leram version=0 antes de qualquer update
        const result = await attemptAssign(currentVersion, currentStatus, 0, userId);
        return { userId, result };
      })
    );

    // Simula o banco: só o primeiro que chegar na transação ganha
    // (SELECT FOR UPDATE serializa isso — aqui simulamos o comportamento)
    for (const { userId, result } of results) {
      if (result.won && !winner) {
        winner = userId;
        currentVersion = 1;
        currentStatus = 'open';
      }
    }

    // Agora verifica quem perdeu dado o novo estado
    for (const { userId, result } of results) {
      if (userId !== winner) {
        const recheck = await attemptAssign(currentVersion, currentStatus, 0, userId);
        if (!recheck.won) losers.push(userId);
      }
    }

    expect(winner).not.toBeNull();
    expect(losers.length).toBe(users.length - 1);
  });

  it('não deve atribuir conversa já resolvida', async () => {
    const result = await attemptAssign(5, 'resolved', 5, 'user-a');
    expect(result.won).toBe(false);
    expect(result.error).toBe('Conversa não está pendente');
  });

  it('version mismatch retorna false mesmo com status correto', async () => {
    const result = await attemptAssign(3, 'pending', 2, 'user-late');
    expect(result.won).toBe(false);
    expect(result.error).toContain('atribuída por outro atendente');
  });
});
