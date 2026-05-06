import { createContext, useContext, useState, ReactNode } from "react";
import { User } from "@workspace/api-client-react";

type CurrentUserContextType = {
  currentUser: User;
  setCurrentUser: (user: User) => void;
};

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

const STORAGE_KEY = "smithTrucking.currentUser";

function loadUser(): User {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === User.Alex || saved === User.Justin) return saved;
  } catch {
    // ignore
  }
  return User.Alex;
}

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<User>(loadUser);

  const setCurrentUser = (user: User) => {
    try {
      localStorage.setItem(STORAGE_KEY, user);
    } catch {
      // ignore
    }
    setCurrentUserState(user);
  };

  return (
    <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return context;
}
