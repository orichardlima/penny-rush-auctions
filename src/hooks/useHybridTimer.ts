import { useState, useEffect, useRef } from 'react';

interface UseHybridTimerProps {
  initialTime: number;
  serverTime?: number;
  isActive: boolean;
  onExpire?: () => void;
}

export const useHybridTimer = ({ 
  initialTime, 
  serverTime, 
  isActive, 
  onExpire 
}: UseHybridTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [lastServerSync, setLastServerSync] = useState(Date.now());
  const intervalRef = useRef<NodeJS.Timeout>();

  // Atualizar com dados do servidor quando disponíveis
  useEffect(() => {
    if (serverTime !== undefined) {
      const timeDiff = Math.abs(timeLeft - serverTime);
      
      // Só sincronizar se a diferença for significativa (>2 segundos)
      if (timeDiff > 2) {
        console.log('🔄 Sincronizando timer híbrido:', { local: timeLeft, server: serverTime, diff: timeDiff });
        setTimeLeft(serverTime);
      }
      setLastServerSync(Date.now());
    }
  }, [serverTime, timeLeft]);

  // Timer local que roda suavemente
  useEffect(() => {
    if (!isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);
        
        if (newTime === 0 && onExpire) {
          onExpire();
        }
        
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, onExpire]);

  // Reset timer when initialTime changes
  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  return {
    timeLeft,
    lastServerSync: Date.now() - lastServerSync
  };
};