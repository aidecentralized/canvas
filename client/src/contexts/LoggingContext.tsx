import React, { createContext, useContext, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { LogEntry } from "../components/LoggingPanel";

interface LoggingContextProps {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  clearLogs: () => void;
  // Special log types
  logToolCall: (toolName: string, data: any) => void;
  logRequest: (data: any) => void;
  logResponse: (data: any, isError?: boolean) => void;
}

const LoggingContext = createContext<LoggingContextProps>({
  logs: [],
  addLog: () => {},
  clearLogs: () => {},
  logToolCall: () => {},
  logRequest: () => {},
  logResponse: () => {},
});

export const useLoggingContext = () => useContext(LoggingContext);

interface LoggingProviderProps {
  children: React.ReactNode;
}

export const LoggingProvider: React.FC<LoggingProviderProps> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add a new log entry
  const addLog = useCallback((logData: Omit<LogEntry, "id" | "timestamp">) => {
    const newLog: LogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...logData,
    };

    setLogs((prevLogs) => [...prevLogs, newLog]);
  }, []);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Log a tool call
  const logToolCall = useCallback((toolName: string, data: any) => {
    addLog({
      type: "tool_call",
      toolName,
      data,
    });
  }, [addLog]);

  // Log an outgoing request
  const logRequest = useCallback((data: any) => {
    addLog({
      type: "request",
      data,
    });
  }, [addLog]);

  // Log an incoming response
  const logResponse = useCallback((data: any, isError?: boolean) => {
    addLog({
      type: "response",
      data,
      isError,
    });
  }, [addLog]);

  return (
    <LoggingContext.Provider
      value={{
        logs,
        addLog,
        clearLogs,
        logToolCall,
        logRequest,
        logResponse,
      }}
    >
      {children}
    </LoggingContext.Provider>
  );
}; 