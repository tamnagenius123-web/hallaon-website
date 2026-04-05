import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
          <AlertTriangle size={48} className="text-orange-500" />
          <h2 className="text-lg font-bold">오류가 발생했습니다</h2>
          <p className="text-muted-foreground text-sm">
            {this.props.fallbackMessage || '페이지를 새로고침해주세요.'}
          </p>
          <p className="text-xs text-muted-foreground font-mono max-w-md break-all">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="notion-btn-primary gap-2"
          >
            <RefreshCw size={14} /> 새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
