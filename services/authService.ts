import { User } from '../types';

const STORAGE_KEY = 'fam_agent_users_db'; // Renamed to carry "fam_agent" prefix for consistency

// Helper interface for local storage user record
interface UserRecord extends User {
    password?: string; // Note: In a real app, never store plain text passwords!
    createdAt: number;
}

export const authService = {
    /**
     * Login with email and password
     */
    login: async (email: string, password: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            // Simulate API network delay
            setTimeout(() => {
                try {
                    const usersJson = localStorage.getItem(STORAGE_KEY);
                    const users: UserRecord[] = usersJson ? JSON.parse(usersJson) : [];

                    // Find user with matching credentials
                    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

                    if (user) {
                        // Return user object without sensitive data
                        const { password, createdAt, ...userData } = user;
                        resolve(userData);
                    } else {
                        // Check if user exists but wrong password, or user doesn't exist
                        const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
                        if (userExists) {
                            reject(new Error('Invalid password. Please try again.'));
                        } else {
                            reject(new Error('No account found with this email. Please sign up.'));
                        }
                    }
                } catch (error) {
                    console.error("Auth Error:", error);
                    reject(new Error('An unexpected error occurred. Please try again.'));
                }
            }, 1000);
        });
    },

    /**
     * Register a new user
     */
    signup: async (name: string, email: string, password: string): Promise<User> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const usersJson = localStorage.getItem(STORAGE_KEY);
                    const users: UserRecord[] = usersJson ? JSON.parse(usersJson) : [];

                    // Check if email already exists
                    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                        reject(new Error('An account with this email already exists. Please sign in instead.'));
                        return;
                    }

                    // Create new user record
                    const newUser: UserRecord = {
                        name,
                        email: email.toLowerCase(), // Normalize email
                        password,
                        // Use consistent avatar based on name (no background=random)
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
                        createdAt: Date.now()
                    };

                    // Save to local storage
                    users.push(newUser);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

                    // Return user object without sensitive data
                    const { password: _, createdAt, ...userData } = newUser;
                    resolve(userData);
                } catch (error) {
                    console.error("Signup Error:", error);
                    reject(new Error('Failed to create account. Please try again.'));
                }
            }, 1000);
        });
    },

    /** 
     * Mock Google Login - ensures the user exists in our local DB or creates one if not
     */
    googleLogin: async (simulatedData?: { email: string, name: string, avatar?: string }): Promise<User> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const usersJson = localStorage.getItem(STORAGE_KEY);
                    const users: UserRecord[] = usersJson ? JSON.parse(usersJson) : [];

                    const googleEmail = simulatedData?.email || 'demo@example.com';
                    const googleName = simulatedData?.name || 'Demo User';
                    const existingUser = users.find(u => u.email === googleEmail);

                    if (existingUser) {
                        const { password, createdAt, ...userData } = existingUser;
                        resolve(userData);
                    } else {
                        // Create mock user if not exists
                        const newUser: UserRecord = {
                            name: googleName,
                            email: googleEmail,
                            avatar: simulatedData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(googleName)}&background=0D8ABC&color=fff`,
                            password: 'google_auth_mock', // Dummy password
                            createdAt: Date.now()
                        };

                        users.push(newUser);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

                        const { password: _, createdAt: __, ...userData } = newUser;
                        resolve(userData);
                    }
                } catch (error) {
                    console.error("Google Auth Error:", error);
                    reject(new Error("Google Login failed"));
                }
            }, 1500);
        });
    },

    /**
     * Update user profile
     */
    updateUser: async (email: string, updates: Partial<User>): Promise<User> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                try {
                    const usersJson = localStorage.getItem(STORAGE_KEY);
                    const users: UserRecord[] = usersJson ? JSON.parse(usersJson) : [];

                    const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

                    if (index !== -1) {
                        const updatedUser = { ...users[index], ...updates };
                        users[index] = updatedUser;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

                        const { password: _, createdAt: __, ...userData } = updatedUser;
                        resolve(userData);
                    } else {
                        // Fallback if user not found in DB (e.g. google login mock), just resolve updates merged
                        // In a real app we would error or create. For now, just return what was sent to keep session UI valid
                        resolve({
                            name: updates.name || 'User',
                            email: email,
                            ...updates
                        } as User);
                    }
                } catch (e) {
                    reject(e);
                }
            }, 500);
        });
    }
};
