import { useState, useEffect, useRef, useCallback } from 'react';

interface UseFluidTimerProps {
  initialTime: number;
  isActive: boolean;
  onExpire?: () => void;
  syncInterval?: number;
}

export const useFluidTimer = ({ 
  initialTime, 
  isActive, 
  onExpire,
  syncInterval = 5000 // Sync with server every 5 seconds by default
}: UseFluidTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(isActive);
  const localTimerRef = useRef<NodeJS.Timeout>();
  const lastSyncTimeRef = useRef<number>(Date.now());
  const serverTimeRef = useRef<number | null>(null);

  // Reset timer when initialTime changes (from props or server sync)
  useEffect(() => {
    setTimeLeft(initialTime);
    setIsRunning(isActive);
  }, [initialTime, isActive]);

  // Smooth local countdown timer
  useEffect(() => {
    if (!isRunning) {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
        localTimerRef.current = undefined;
      }
      return;
    }

    // Clear any existing timer to prevent conflicts
    if (localTimerRef.current) {
      clearInterval(localTimerRef.current);
    }

    localTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        
        // Call onExpire when timer reaches 0
        if (newTime === 0 && onExpire) {
          setTimeout(() => onExpire(), 0); // Async to prevent state update conflicts
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current);
        localTimerRef.current = undefined;
      }
    };
  }, [isRunning, onExpire]);

  // Function to sync with server time (called externally)
  const syncWithServer = useCallback((serverTime: number) => {
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTimeRef.current;
    
    // Only sync if it's been at least 2 seconds since last sync
    // and if there's a significant difference (> 2 seconds)
    if (timeSinceLastSync > 2000) {
      const timeDiff = Math.abs(timeLeft - serverTime);
      
      if (timeDiff > 2) {
        console.log('🔄 Sincronizando timer fluido:', {
          local: timeLeft,
          server: serverTime,
          diff: timeDiff,
          adjusting: true
        });
        
        setTimeLeft(serverTime);
        lastSyncTimeRef.current = now;
        serverTimeRef.current = serverTime;
      }
    }
  }, [timeLeft]);

  // Function to force reset timer (for bid events)
  const resetTimer = useCallback((newTime: number = 15) => {
    console.log('⏰ Resetando timer para:', newTime);
    setTimeLeft(newTime);
    setIsRunning(true);
    lastSyncTimeRef.current = Date.now();
  }, []);

  // Function to stop timer
  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(0);
  }, []);

  return {
    timeLeft,
    isRunning,
    syncWithServer,
    resetTimer,
    stopTimer
  };
};