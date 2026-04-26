import React from 'react';

type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
type MessageType = 'text' | 'image' | 'audio' | 'document' | 'internal_note';

interface Message {
  id: string;
  text?: string;
  type: MessageType;
  status?: MessageStatus;
  createdAt: string;
  isOutbound: boolean;
  mediaUrl?: string;
  fileName?: string;
  senderName?: string;
}

interface Props {
  message: Message;
}

function StatusIcon({ status }: { status?: MessageStatus }) {
  if (!status) return null;
  if (status === 'sent')
    return (
      <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  if (status === 'delivered')
    return (
      <span className="flex -space-x-1.5">
        <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg className="h-3.5 w-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  if (status === 'read')
    return (
      <span className="flex -space-x-1.5">
        <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  if (status === 'failed')
    return (
      <svg className="h-3.5 w-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  return null;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function AudioMessage({ mediaUrl }: { mediaUrl?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <svg className="h-6 w-6 text-current opacity-70 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 9a1 1 0 001-1v-1a1 1 0 00-2 0v1a1 1 0 001 1z" />
      </svg>
      {mediaUrl ? (
        <audio controls src={mediaUrl} className="h-8 flex-1" />
      ) : (
        <div className="flex-1 h-2 rounded-full bg-current opacity-30" />
      )}
    </div>
  );
}

function ImageMessage({ mediaUrl, text }: { mediaUrl?: string; text?: string }) {
  return (
    <div>
      {mediaUrl ? (
        <img
          src={mediaUrl}
          alt={text ?? 'Imagem'}
          className="max-w-xs rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="h-32 w-48 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
          Imagem
        </div>
      )}
      {text && <p className="mt-1 text-sm">{text}</p>}
    </div>
  );
}

function DocumentMessage({ mediaUrl, fileName }: { mediaUrl?: string; fileName?: string }) {
  return (
    <a
      href={mediaUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-lg border border-current/20 px-3 py-2 hover:bg-current/5 transition-colors"
    >
      <svg className="h-8 w-8 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-sm font-medium truncate max-w-[180px]">
        {fileName ?? 'Documento'}
      </span>
    </a>
  );
}

export function MessageBubble({ message }: Props) {
  const isNote = message.type === 'internal_note';
  const isOut = message.isOutbound;

  const bubbleBase = 'relative max-w-sm rounded-2xl px-3 py-2 shadow-sm text-sm';
  const bubbleColor = isNote
    ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
    : isOut
    ? 'bg-brand-600 text-white rounded-br-sm'
    : 'bg-white text-gray-900 rounded-bl-sm';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}>
      <div className={`${bubbleBase} ${bubbleColor}`}>
        {isNote && (
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-yellow-700">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
              <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
            Nota interna
            {message.senderName && ` · ${message.senderName}`}
          </span>
        )}

        {!isNote && !isOut && message.senderName && (
          <p className="mb-0.5 text-xs font-semibold text-brand-600">{message.senderName}</p>
        )}

        {message.type === 'text' || message.type === 'internal_note' ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>
        ) : message.type === 'audio' ? (
          <AudioMessage mediaUrl={message.mediaUrl} />
        ) : message.type === 'image' ? (
          <ImageMessage mediaUrl={message.mediaUrl} text={message.text} />
        ) : message.type === 'document' ? (
          <DocumentMessage mediaUrl={message.mediaUrl} fileName={message.fileName} />
        ) : (
          <p>{message.text}</p>
        )}

        <div className={`mt-1 flex items-center gap-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-[10px] ${isOut ? 'text-white/70' : 'text-gray-400'}`}>
            {formatTime(message.createdAt)}
          </span>
          {isOut && <StatusIcon status={message.status} />}
        </div>
      </div>
    </div>
  );
}
