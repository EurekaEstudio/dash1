import React from 'react';
import { TableConfig, Message } from '../types';
import { ChatBubbleIcon, UsersIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from '../components/icons';

// Reusable Message Renderer for "Humano/IA" format
const MessageRenderer: React.FC<{ messageField: any }> = ({ messageField }) => {
    if (!messageField) return <span className="text-gray-500 italic">No message</span>;
    
    // Check if messageField is an object and has a text property, otherwise stringify
    const rawText = (typeof messageField === 'object' && messageField !== null && 'text' in messageField) ? String(messageField.text) : String(messageField);

    const processText = (text: string) => {
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        markdownLinkRegex.lastIndex = 0;

        while ((match = markdownLinkRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                elements.push(text.substring(lastIndex, match.index));
            }
            const [, linkText, linkUrl] = match;
            elements.push(
                <a key={lastIndex} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">
                    {linkText}
                </a>
            );
            lastIndex = markdownLinkRegex.lastIndex;
        }
        if (lastIndex < text.length) {
            elements.push(text.substring(lastIndex));
        }
        return <>{elements.map((el, i) => <React.Fragment key={i}>{el}</React.Fragment>)}</>;
    };

    const renderWithNewlines = (text: string) => {
        return text.split('\\n').map((line, index) => (
            <span key={index} className="block">
                {processText(line)}
            </span>
        ));
    };

    const parts = rawText.split(/IA:|IA\n/);
    const hasBothParts = parts.length > 1 && (rawText.toLowerCase().includes('humano:') || rawText.toLowerCase().includes('usuario:'));

    if (hasBothParts) {
        const humanText = parts[0].replace(/^(Humano|Usuario):\s*/i, '').trim();
        const aiText = parts.slice(1).join('IA:').trim();
        return (
            <div className="whitespace-normal py-1 text-sm">
                <div className="mb-2">
                    <span className="font-bold text-gray-200">Usuario:</span>
                    <div className="pl-2 mt-1 text-gray-400">{renderWithNewlines(humanText)}</div>
                </div>
                <div>
                    <span className="font-bold text-primary-400">IA:</span>
                    <div className="pl-2 mt-1 text-gray-400">{renderWithNewlines(aiText)}</div>
                </div>
            </div>
        );
    }

    return <div className="whitespace-normal py-1 text-gray-400 text-sm">{renderWithNewlines(rawText)}</div>;
};


const hasRxRequest = (msgs: Message[]): boolean => {
    if(!msgs) return false;
    return msgs.some(m => {
        const rawText = (typeof m.message === 'object' && m.message?.text) ? m.message.text : String(m.message);
        return rawText.toLowerCase().includes('radiograf');
    });
};

// --- Table Configurations ---

const n8nHistorialConfig: TableConfig = {
    id: 'n8n_historial',
    name: 'Historial de Interacción Chatbot Clínica Dental Yany',
    tableName: 'n8n_historial',
    columns: [
        { id: 'message', header: 'Mensaje', accessor: row => row.message, render: value => <MessageRenderer messageField={value} />, isPrimary: true },
        { id: 'session_id', header: 'ID Sesión', accessor: row => row.session_id, render: value => <span className="font-mono text-xs" title={value}>...{value.slice(-6)}</span> },
        { id: 'created_at', header: 'Fecha', accessor: row => row.created_at, render: value => <span>{new Date(value).toLocaleString('es-ES')}</span> },
        { id: 'rx_request', header: 'Solicitud RX', accessor: row => row._sessionMessages, render: (value) => hasRxRequest(value) ? <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto" /> : <XCircleIcon className="w-6 h-6 text-red-500 mx-auto" />, className: 'text-center' }
    ],
    filters: [
        { id: 'q', label: 'Buscar en mensajes...', type: 'text' },
        { id: 'session_id', label: 'Filtrar por ID de Sesión...', type: 'text' },
        { id: 'from', label: 'Desde', type: 'date' },
        { id: 'to', label: 'Hasta', type: 'date' },
        { 
          id: 'special_request', 
          label: 'Solicitud RX', 
          type: 'select', 
          options: [{value: 'requested', label: 'Solicitadas'}, {value: 'not_requested', label: 'No Solicitadas'}],
          db_column: 'message->>text',
          db_column_type: 'text_match',
          db_match_string: 'radiograf'
        }
    ],
    stats: [
        { id: 'totalMessages', title: 'Mensajes Totales', icon: <ChatBubbleIcon className="w-8 h-8"/>, getValue: (data) => data.length },
        { id: 'totalSessions', title: 'Sesiones Totales', icon: <UsersIcon className="w-8 h-8"/>, getValue: (_, sessions) => Object.keys(sessions).length },
        { id: 'lastMessage', title: 'Último Mensaje', icon: <CalendarIcon className="w-8 h-8"/>, getValue: (data) => data.length > 0 ? new Date(data[0].created_at).toLocaleDateString('es-ES') : 'N/A' },
    ],
    analytics: {
        sessionAnalysis: {
            legend: { positive: 'Con Solicitud RX', negative: 'Sin Solicitud RX' },
            colors: { positive: '#10B981', negative: '#3B82F6' },
            isPositive: hasRxRequest,
            filterColumn: 'message->>text',
            filterType: 'text_match',
            filterMatchString: 'radiograf'
        }
    }
};

export const tableConfigs: Record<string, TableConfig> = {
    [n8nHistorialConfig.id]: n8nHistorialConfig,
};