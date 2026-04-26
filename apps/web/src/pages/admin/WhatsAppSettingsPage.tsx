import React from 'react';
import {
  useWhatsAppStatus,
  useWhatsAppConnect,
  useWhatsAppDisconnect,
} from '../../hooks/useAdmin';
import { Button } from '../../components/ui/Button';

type WaStatus = 'connected' | 'disconnected' | 'awaiting_qr';

const STATUS_CONFIG: Record<
  WaStatus,
  { label: string; color: string; dotColor: string; description: string }
> = {
  connected: {
    label: 'Conectado',
    color: 'bg-green-50 border-green-200 text-green-800',
    dotColor: 'bg-green-500',
    description: 'WhatsApp está ativo e recebendo mensagens.',
  },
  disconnected: {
    label: 'Desconectado',
    color: 'bg-gray-50 border-gray-200 text-gray-600',
    dotColor: 'bg-gray-400',
    description: 'WhatsApp não está conectado. Clique em "Conectar" para iniciar.',
  },
  awaiting_qr: {
    label: 'Aguardando QR Code',
    color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    dotColor: 'bg-yellow-500 animate-pulse',
    description: 'Escaneie o QR Code abaixo com o WhatsApp do seu celular.',
  },
};

export default function WhatsAppSettingsPage() {
  const { data, isLoading, error } = useWhatsAppStatus();
  const connect = useWhatsAppConnect();
  const disconnect = useWhatsAppDisconnect();

  const status: WaStatus = data?.status ?? 'disconnected';
  const config = STATUS_CONFIG[status];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure a conexão com o WhatsApp Business</p>
      </div>

      {/* Status card */}
      <div className={`rounded-xl border p-6 mb-6 ${config.color}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full flex-shrink-0 ${config.dotColor}`} />
            <div>
              <p className="font-semibold">{config.label}</p>
              <p className="text-sm opacity-75 mt-0.5">{config.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {status === 'disconnected' && (
              <Button
                onClick={() => connect.mutate()}
                loading={connect.isPending}
                size="sm"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
                Conectar WhatsApp
              </Button>
            )}
            {(status === 'connected' || status === 'awaiting_qr') && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => disconnect.mutate()}
                loading={disconnect.isPending}
              >
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* QR Code */}
      {status === 'awaiting_qr' && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Escanear QR Code</h2>
          <p className="text-sm text-gray-600 mb-4">
            Abra o WhatsApp no seu celular, vá em{' '}
            <strong>Dispositivos vinculados</strong> e escaneie o código abaixo.
          </p>
          <div className="flex justify-center">
            {data?.qrCode ? (
              <div className="rounded-xl bg-white p-4 shadow-inner border border-gray-200 inline-block">
                {/* QR code como imagem base64 ou URL */}
                {data.qrCode.startsWith('data:') || data.qrCode.startsWith('http') ? (
                  <img
                    src={data.qrCode}
                    alt="QR Code WhatsApp"
                    className="h-56 w-56 object-contain"
                  />
                ) : (
                  /* SVG inline se vier como string SVG */
                  <div
                    className="h-56 w-56"
                    dangerouslySetInnerHTML={{ __html: data.qrCode }}
                  />
                )}
              </div>
            ) : (
              <div className="h-56 w-56 rounded-xl bg-white border border-gray-200 flex flex-col items-center justify-center gap-3">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                <p className="text-xs text-gray-500">Gerando QR code...</p>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            O QR code atualiza automaticamente a cada 3 segundos
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-4">
          Erro ao carregar status: {(error as any).message}
        </div>
      )}

      {/* Info card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Informações</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Status atual</dt>
            <dd className="font-medium text-gray-900">{config.label}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Atualização automática</dt>
            <dd className="font-medium text-gray-900">A cada 3 segundos</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Protocolo</dt>
            <dd className="font-medium text-gray-900">WhatsApp Web Multi-Device</dd>
          </div>
        </dl>
      </div>

      {/* Steps guide */}
      {status === 'disconnected' && (
        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-semibold text-blue-900 mb-3">Como conectar</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="flex-shrink-0 font-bold">1.</span>
              Clique em "Conectar WhatsApp" acima
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 font-bold">2.</span>
              Abra o WhatsApp no celular vinculado ao número da empresa
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 font-bold">3.</span>
              Toque em <strong>Mais opções</strong> (3 pontos) ou <strong>Configurações</strong>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 font-bold">4.</span>
              Toque em <strong>Dispositivos vinculados</strong>
            </li>
            <li className="flex gap-2">
              <span className="flex-shrink-0 font-bold">5.</span>
              Toque em <strong>Vincular um dispositivo</strong> e escaneie o QR code
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
