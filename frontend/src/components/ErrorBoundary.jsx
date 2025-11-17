import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: 'linear-gradient(135deg, #a5b4fc 0%, #93c5fd 50%, #a5f3fc 100%)'
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '1rem',
            maxWidth: '600px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ color: '#dc2626', marginBottom: '1rem' }}>Something went wrong</h1>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #4facfe 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Reload Page
            </button>
            <details style={{ marginTop: '1rem', color: '#6b7280' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Error Details</summary>
              <pre style={{
                background: '#f3f4f6',
                padding: '1rem',
                borderRadius: '0.5rem',
                overflow: 'auto',
                fontSize: '0.875rem'
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

