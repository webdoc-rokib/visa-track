import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { getDhakaDate } from './utils/timezoneUtils';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState(prev => ({
      error,
      errorInfo,
      errorCount: prev.errorCount + 1
    }));

    // Log to external error tracking (Firebase Crashlytics, Sentry, etc.)
    // TODO: Implement error logging to production monitoring service
    if (window.errorTrackingService) {
      window.errorTrackingService.logException(error, {
        componentStack: errorInfo.componentStack,
        timestamp: getDhakaDate().toISOString()
      });
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const isDarkMode = localStorage.getItem('visaTrackDarkMode') === 'true';
      
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${
          isDarkMode ? 'bg-slate-950' : 'bg-slate-50'
        }`}>
          <div className={`max-w-md w-full rounded-xl border p-8 ${
            isDarkMode 
              ? 'bg-slate-900 border-red-800' 
              : 'bg-white border-red-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-full ${
                isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
              }`}>
                <AlertCircle className={`h-6 w-6 ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`} />
              </div>
              <h1 className={`text-2xl font-bold ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                Oops! Something went wrong
              </h1>
            </div>

            <p className={`text-sm mb-6 ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              The application encountered an unexpected error. Our team has been notified.
              Please try refreshing the page or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className={`mb-6 p-3 rounded-lg text-xs border ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700 text-slate-300' 
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <summary className="cursor-pointer font-semibold mb-2">
                  Developer Info (Error Details)
                </summary>
                <pre className="overflow-auto whitespace-pre-wrap break-words max-h-40">
                  {this.state.error && this.state.error.toString()}
                </pre>
                <hr className={`my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                <pre className="overflow-auto whitespace-pre-wrap break-words max-h-40">
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Go Home
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p className={`mt-4 text-xs text-center ${
                isDarkMode ? 'text-amber-400' : 'text-amber-600'
              }`}>
                ⚠️ Multiple errors detected. Please clear your browser cache or contact support.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
