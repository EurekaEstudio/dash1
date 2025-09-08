import React from 'react';

export type Message = Record<string, any>;

export interface ChatMessage extends Message {
  id: number;
  session_id: string;
  message: any;
  created_at: string;
}

// Configuration Types for Dynamic Tables
export interface TableColumn {
  id: string;
  header: string;
  accessor: (row: Message) => any;
  render?: (value: any, row: Message) => React.ReactNode;
  className?: string;
  isPrimary?: boolean; // The main expandable column
}

export interface Filter {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select';
  options?: { value: string; label: string }[];
  // Properties for DB-level filtering on 'select' types
  db_column?: string;
  db_column_type?: 'boolean' | 'text_match';
  db_match_string?: string;
}

export interface StatCardConfig {
    id: string;
    title: string;
    icon: React.ReactNode;
    getValue: (data: Message[], sessions: Record<string, Message[]>) => string | number;
}

export interface AnalyticsConfig {
    sessionAnalysis: {
        legend: {
            positive: string;
            negative: string;
        };
        colors: {
            positive: string;
            negative: string;
        };
        isPositive: (messages: Message[]) => boolean;
        filterColumn: string;
        filterType: 'boolean' | 'text_match';
        filterMatchString?: string;
    }
}

export interface TableConfig {
  id: string;
  name: string;
  tableName: string;
  columns: TableColumn[];
  filters: Filter[];
  stats: StatCardConfig[];
  analytics: AnalyticsConfig;
}

// Prop Types for Components
export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
}

export interface SessionSummary {
  session_id: string;
  message_count: number;
  last_message_at: string;
}