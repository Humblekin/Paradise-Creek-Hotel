import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error);
    console.error('Component stack:', errorInfo?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '1rem', color: 'red', background: '#fff3f3', border: '1px solid red', borderRadius: 8, margin: 8 }}>
          <strong>Error:</strong> {this.state.error.message}<br />
          <pre style={{ fontSize: 11, marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
