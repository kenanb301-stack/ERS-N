import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Hata Sınırı Bileşeni (React Error Boundary)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Switched from a class property for state to a constructor to explicitly
  // call `super(props)`. This ensures `this.props` is correctly initialized on the
  // component instance, resolving the TypeScript error where `props` was not found.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uygulama Hatası:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
          <h1 style={{ color: '#ef4444' }}>Bir şeyler yanlış gitti.</h1>
          <p>Uygulama yüklenirken bir hata oluştu.</p>
          <pre style={{ background: '#f1f5f9', padding: '10px', borderRadius: '5px', overflowX: 'auto', textAlign: 'left', maxWidth: '600px', margin: '20px auto', fontSize: '12px' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => {
                localStorage.clear();
                window.location.reload();
            }}
            style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Önbelleği Temizle ve Yenile
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
