import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PanelErrorBoundaryProps {
  children: ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
}

export class PanelErrorBoundary extends Component<
  PanelErrorBoundaryProps,
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        className="mx-auto mt-8 max-w-xl rounded-lg border border-destructive/30 bg-destructive/5 p-6"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="space-y-3">
            <div>
              <h2 className="font-semibold">This panel could not be rendered</h2>
              <p className="text-sm text-muted-foreground">
                The rest of SecureFlow is still available. Retry this panel, or
                navigate elsewhere if the error persists.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={this.reset}>
              Retry panel
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
