import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  FormField,
  Input,
  Button,
  Container,
  Header,
  Box,
  SpaceBetween,
  Alert,
  StatusIndicator,
  Badge,
} from '@cloudscape-design/components';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { authService, resolveLciApiBase, type OperatorIdentity } from '../services/api';

interface LoginProps {
  onLoginSuccess?: (operator: OperatorIdentity) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('reason') === 'session_expired';
    }
    return false;
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('lola_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyMode(newTheme === 'dark' ? Mode.Dark : Mode.Light);
    localStorage.setItem('lola_theme', newTheme);
    window.dispatchEvent(new CustomEvent('lola-theme-change', { detail: newTheme }));
  };

  // If already authenticated, automatically redirect to home console
  useEffect(() => {
    if (authService.isAuthenticated() && authService.getCurrentOperator()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const validate = (): boolean => {
    let isValid = true;
    if (!username.trim()) {
      setUsernameError('Operator username is required.');
      isValid = false;
    } else {
      setUsernameError(null);
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters.');
      isValid = false;
    } else {
      setPasswordError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.login({ username, password });
      const op = response.operator || { username, role: 'OPERATOR' };
      setSuccessMessage(`Welcome back, ${op.username}! Authenticated successfully.`);
      if (onLoginSuccess) {
        onLoginSuccess(op);
      }
      const redirectPath = sessionStorage.getItem('lola_redirect_after_login') || '/';
      sessionStorage.removeItem('lola_redirect_after_login');
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else if (error.message?.includes('Network Error') || error.message?.includes('ECONNREFUSED')) {
        setErrorMessage(
          `Could not reach Lola Core Identity (LCI) backend at ${resolveLciApiBase()}. Ensure the backend service is running.`
        );
      } else {
        setErrorMessage(error.message || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--lola-bg-layout)',
        color: 'var(--lola-text-main)',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
        }}
      >
        <Button
          variant="icon"
          iconName="light-dark"
          ariaLabel={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onClick={handleToggleTheme}
        />
      </div>

      <div style={{ width: '100%', maxWidth: '480px' }}>
        <SpaceBetween size="l">
          <Box textAlign="center">
            <SpaceBetween size="xs">
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <img
                  src="/logo-circle.png"
                  alt="LolaCloud"
                  style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                />
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '-0.5px',
                    color: 'var(--lola-text-main)',
                  }}
                >
                  LolaCloud
                </span>
                <Badge color="blue">Console</Badge>
              </div>
              <Box variant="p" color="text-body-secondary">
                Unified Infrastructure & Core Identity Management
              </Box>
            </SpaceBetween>
          </Box>

          <Container
            header={
              <Header
                variant="h2"
                description="Authenticate using your operator credentials to access the console."
              >
                Operator Sign In
              </Header>
            }
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
            >
              <SpaceBetween size="m">
                {sessionExpiredNotice && (
                  <Alert
                    type="warning"
                    dismissible
                    onDismiss={() => setSessionExpiredNotice(false)}
                    header="Session Expired"
                  >
                    Your operator session has expired or the token became invalid. Please sign in again to continue.
                  </Alert>
                )}

                {errorMessage && (
                  <Alert
                    type="error"
                    dismissible
                    onDismiss={() => setErrorMessage(null)}
                    header="Authentication Error"
                  >
                    {errorMessage}
                  </Alert>
                )}

                {successMessage && (
                  <Alert type="success" header="Success">
                    {successMessage}
                  </Alert>
                )}

                <Form
                  actions={
                    <SpaceBetween direction="horizontal" size="xs">
                      <Button
                        variant="primary"
                        loading={isLoading}
                        formAction="submit"
                      >
                        Sign in to Console
                      </Button>
                    </SpaceBetween>
                  }
                >
                  <SpaceBetween size="m">
                    <FormField
                      label="Operator Username"
                      description="Enter your authorized LolaCloud username or ID"
                      errorText={usernameError}
                    >
                      <Input
                        value={username}
                        onChange={({ detail }) => {
                          setUsername(detail.value);
                          if (usernameError) setUsernameError(null);
                        }}
                        placeholder="e.g. admin or operator.1"
                        disabled={isLoading}
                        autoFocus
                      />
                    </FormField>

                    <FormField
                      label="Password"
                      description="Enter your operator secret key or password"
                      errorText={passwordError}
                    >
                      <Input
                        value={password}
                        onChange={({ detail }) => {
                          setPassword(detail.value);
                          if (passwordError) setPasswordError(null);
                        }}
                        type="password"
                        placeholder="••••••••••••"
                        disabled={isLoading}
                      />
                    </FormField>
                  </SpaceBetween>
                </Form>
              </SpaceBetween>
            </form>
          </Container>

          <Box textAlign="center" color="text-body-secondary">
            <SpaceBetween size="xxs">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <StatusIndicator type="success">LCI Gateway: {resolveLciApiBase()}</StatusIndicator>
              </div>
              <div style={{ fontSize: '12px' }}>
                LolaCloud Infrastructure Platform &copy; {new Date().getFullYear()}
              </div>
            </SpaceBetween>
          </Box>
        </SpaceBetween>
      </div>
    </div>
  );
};

export default Login;
