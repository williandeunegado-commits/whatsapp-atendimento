import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WhatsAppProvider, InboundMessage, ConnectionStatus } from '@wa/shared';

// Mock provider que implementa a interface completa
class MockWhatsAppProvider implements WhatsAppProvider {
  private status: ConnectionStatus = 'disconnected';
  private messageHandlers: Array<(msg: InboundMessage) => Promise<void>> = [];
  private statusHandlers: Array<(status: ConnectionStatus) => void> = [];
  private qrHandlers: Array<(qr: string) => void> = [];
  private statusUpdateHandlers: Array<any> = [];

  async connect(): Promise<void> {
    this.status = 'qr_ready';
    this.qrHandlers.forEach(h => h('mock-qr-data'));
    this.status = 'connected';
    this.statusHandlers.forEach(h => h('connected'));
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
    this.statusHandlers.forEach(h => h('disconnected'));
  }

  getStatus(): ConnectionStatus { return this.status; }

  async sendText(to: string, text: string): Promise<{ id: string }> {
    if (this.status !== 'connected') throw new Error('Not connected');
    return { id: `mock-${Date.now()}` };
  }

  async sendMedia(): Promise<{ id: string }> {
    if (this.status !== 'connected') throw new Error('Not connected');
    return { id: `mock-media-${Date.now()}` };
  }

  async downloadMedia(): Promise<NodeJS.ReadableStream> {
    throw new Error('Mock: no media to download');
  }

  onMessage(handler: (msg: InboundMessage) => Promise<void>): void {
    this.messageHandlers.push(handler);
  }

  onStatusChange(handler: (status: ConnectionStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  onQRCode(handler: (qr: string) => void): void {
    this.qrHandlers.push(handler);
  }

  onMessageStatusUpdate(handler: any): void {
    this.statusUpdateHandlers.push(handler);
  }

  // Helper de teste: simula recebimento de mensagem
  simulateInbound(msg: Partial<InboundMessage>) {
    const full: InboundMessage = {
      whatsappMessageId: 'wa-test-1',
      from: '5511999999999',
      type: 'text',
      content: { text: 'Olá' },
      timestamp: new Date(),
      ...msg,
    };
    this.messageHandlers.forEach(h => h(full));
  }
}

describe('WhatsAppProvider — Contrato de Interface', () => {
  let provider: WhatsAppProvider;

  beforeEach(() => {
    provider = new MockWhatsAppProvider();
  });

  it('deve iniciar desconectado', () => {
    expect(provider.getStatus()).toBe('disconnected');
  });

  it('deve notificar statusHandlers na conexão', async () => {
    const statusChanges: ConnectionStatus[] = [];
    provider.onStatusChange((s) => statusChanges.push(s));
    await provider.connect();
    expect(statusChanges).toContain('connected');
  });

  it('deve notificar qrHandlers ao gerar QR', async () => {
    const qrCodes: string[] = [];
    provider.onQRCode((qr) => qrCodes.push(qr));
    await provider.connect();
    expect(qrCodes).toHaveLength(1);
    expect(qrCodes[0]).toBe('mock-qr-data');
  });

  it('deve chamar messageHandler quando mensagem é recebida', async () => {
    const received: InboundMessage[] = [];
    provider.onMessage(async (msg) => { received.push(msg); });
    await provider.connect();

    (provider as MockWhatsAppProvider).simulateInbound({ content: { text: 'teste' } });
    expect(received).toHaveLength(1);
    expect(received[0]!.content.text).toBe('teste');
  });

  it('deve enviar texto quando conectado', async () => {
    await provider.connect();
    const result = await provider.sendText('5511999999999', 'Olá!');
    expect(result.id).toBeTruthy();
    expect(typeof result.id).toBe('string');
  });

  it('deve lançar erro ao enviar sem estar conectado', async () => {
    await expect(provider.sendText('5511999999999', 'Olá')).rejects.toThrow('Not connected');
  });

  it('status deve ser disconnected após disconnect()', async () => {
    await provider.connect();
    expect(provider.getStatus()).toBe('connected');
    await provider.disconnect();
    expect(provider.getStatus()).toBe('disconnected');
  });

  it('deve implementar todos os métodos da interface', () => {
    expect(typeof provider.connect).toBe('function');
    expect(typeof provider.disconnect).toBe('function');
    expect(typeof provider.getStatus).toBe('function');
    expect(typeof provider.sendText).toBe('function');
    expect(typeof provider.sendMedia).toBe('function');
    expect(typeof provider.downloadMedia).toBe('function');
    expect(typeof provider.onMessage).toBe('function');
    expect(typeof provider.onStatusChange).toBe('function');
    expect(typeof provider.onQRCode).toBe('function');
    expect(typeof provider.onMessageStatusUpdate).toBe('function');
  });
});
