import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 text-center text-destructive">
            <p className="font-semibold">Ocorreu um erro ao carregar este conteúdo.</p>
            <p className="text-sm text-muted-foreground mt-1">{this.state.error?.message}</p>
            <button
              className="mt-3 text-sm underline text-primary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Tentar novamente
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
