import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { AuthProvider } from './contexts/AuthContext';

// Monkey patch for Google Translate to prevent React unmount crashes
if (typeof Node === 'function' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function(child: any) {
    if (child.parentNode !== this) {
      if (console) console.warn('Google Translate React Fix: Ignored removeChild');
      return child;
    }
    return originalRemoveChild.apply(this, arguments as any);
  };
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(newNode: any, referenceNode: any) {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) console.warn('Google Translate React Fix: Ignored insertBefore');
      return newNode;
    }
    return originalInsertBefore.apply(this, arguments as any);
  };
}

import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PreferencesProvider>
          <App />
        </PreferencesProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
