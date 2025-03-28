import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { combineReducers } from "redux";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";

// Create a placeholder reducer
const placeholderReducer = (state = {}, _action: any) => {
  return state;
};

// Create the root reducer
const rootReducer = combineReducers({
  // Add at least one reducer
  placeholder: placeholderReducer,
  // Add your actual reducers when ready
  // chat: chatSlice,
  // tools: toolsSlice,
});

// Configure the store
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
  // Use Vite's environment variable format instead
  devTools: import.meta.env.MODE !== "production",
});

// Set up listeners for RTK Query (if used)
setupListeners(store.dispatch);

// Define types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Create typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
