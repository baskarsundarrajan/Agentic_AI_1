import React, { useState } from 'react';
import { StethoscopeIcon } from './shared/IconComponents';
import { signInUser, signUpUser, sendPasswordResetEmail } from '../services/firebaseService';

type AuthMode = 'signin' | 'signup' | 'reset';

const Auth: React.FC = () => {
    const [mode, setMode] = useState<AuthMode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const inputStyles = "w-full px-4 py-2 text-slate-100 bg-slate-800/70 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder-slate-400";

    const resetFormState = () => {
        setError('');
        setSuccessMessage('');
        setEmail('');
        setPassword('');
        setDisplayName('');
    };

    const toggleMode = () => {
        setMode(mode === 'signin' ? 'signup' : 'signin');
        resetFormState();
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await sendPasswordResetEmail(email);
            setSuccessMessage('Reset email sent! Check your inbox (and spam folder) to continue.');
        } catch (err: any) {
             let friendlyMessage = "An unexpected error occurred.";
             if (err.code) {
                switch (err.code) {
                    case 'auth/invalid-email':
                        friendlyMessage = "Please enter a valid email address.";
                        break;
                    case 'auth/user-not-found':
                        friendlyMessage = "No account found with this email address.";
                        break;
                    default:
                        friendlyMessage = "Failed to send reset email. Please try again.";
                }
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            if (mode === 'signup') {
                if(!displayName) {
                    setError('Please enter your name.');
                    setIsLoading(false);
                    return;
                }
                await signUpUser(email, password, displayName);
            } else {
                await signInUser(email, password);
            }
        } catch (err: any) {
            let friendlyMessage = "An unexpected error occurred.";
            if (err.code) {
                switch (err.code) {
                    case 'auth/invalid-email':
                        friendlyMessage = "Please enter a valid email address.";
                        break;
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                    case 'auth/invalid-credential':
                        friendlyMessage = "Invalid email or password.";
                        break;
                    case 'auth/email-already-in-use':
                        friendlyMessage = "This email is already registered. Please sign in.";
                        break;
                    case 'auth/weak-password':
                         friendlyMessage = "Password should be at least 6 characters.";
                        break;
                    default:
                        friendlyMessage = "Authentication failed. Please try again.";
                }
            }
            setError(friendlyMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const renderFooter = () => {
        if (mode === 'reset') {
            return (
                 <p className="text-sm text-center text-slate-400">
                    Remembered your password?
                    <button type="button" onClick={() => { setMode('signin'); resetFormState(); }} className="ml-1 font-semibold text-teal-300 hover:underline">
                        Sign In
                    </button>
                </p>
            );
        }
        return (
            <p className="text-sm text-center text-slate-400">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                <button type="button" onClick={toggleMode} className="ml-1 font-semibold text-teal-300 hover:underline">
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
            </p>
        );
    };

    const getTitle = () => {
        if (mode === 'reset') return 'Reset Password';
        if (mode === 'signup') return 'Create Your Account';
        return 'Welcome to MedCrew AI';
    };

    const getSubtitle = () => {
        if (mode === 'reset') return 'Enter your email to receive a password reset link.';
        if (mode === 'signup') return 'Create an account to get started.';
        return 'Sign in to access your health dashboard.';
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md glassmorphic-card rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 p-8 space-y-6">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full mb-4 shadow-[0_0_15px_rgba(0,198,255,0.6)]">
                        <StethoscopeIcon />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-100">{getTitle()}</h1>
                    <p className="text-slate-400 mt-2">{getSubtitle()}</p>
                </div>
                
                {mode === 'reset' ? (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputStyles}
                        />
                        {successMessage && <p className="text-sm text-green-400 text-center">{successMessage}</p>}
                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-3 font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-700 transition-colors neon-button"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                         {mode === 'signup' && (
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                                className={inputStyles}
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email Address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={inputStyles}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={inputStyles}
                        />
                        {mode === 'signin' && (
                            <div className="text-right -mt-2">
                                <button
                                    type="button"
                                    onClick={() => { setMode('reset'); resetFormState(); }}
                                    className="text-xs font-semibold text-teal-300 hover:underline focus:outline-none"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full px-4 py-3 font-semibold text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-700 transition-colors neon-button"
                        >
                            {isLoading ? 'Processing...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>
                )}
                {renderFooter()}
            </div>
        </div>
    );
};

export default Auth;