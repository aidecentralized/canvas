// client/src/theme.ts
import { extendTheme, ThemeConfig } from "@chakra-ui/react";

// Color scheme configuration
const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

// Custom theme for the application
export const theme = extendTheme({
  config,
  colors: {
    // Modern gradient color palette
    primary: {
      50: "#f0e7ff",
      100: "#d1beff",
      200: "#b195ff",
      300: "#936cff",
      400: "#7443ff",
      500: "#5a1aff", // Primary accent color
      600: "#4c14d9",
      700: "#3e0fb3",
      800: "#300a8c",
      900: "#220666",
    },
    // Secondary accent color (teal-like)
    secondary: {
      50: "#e6fbff",
      100: "#b8f1ff",
      200: "#8ae7ff",
      300: "#5cddff",
      400: "#2ed3ff",
      500: "#00c9ff", // Secondary accent
      600: "#00a3d4",
      700: "#007eab",
      800: "#005a82",
      900: "#003559",
    },
    // Dark theme background gradients
    dark: {
      100: "#282a36", // Lighter background
      200: "#21222c", // Container background
      300: "#1a1b26", // Main background
      400: "#16161e", // Darker background
      500: "#101014", // Deepest background
    },
  },
  styles: {
    global: {
      body: {
        bg: "linear-gradient(135deg, #16161e 0%, #1e1e2a 100%)",
        color: "white",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
      },
      "*::placeholder": {
        color: "whiteAlpha.400",
      },
      "*, *::before, &::after": {
        borderColor: "whiteAlpha.200",
      },
    },
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "md",
      },
      variants: {
        solid: {
          bg: "primary.500",
          color: "white",
          _hover: {
            bg: "primary.600",
            _disabled: {
              bg: "primary.500",
            },
          },
          _active: {
            bg: "primary.700",
          },
        },
        outline: {
          borderColor: "primary.500",
          color: "primary.500",
          _hover: {
            bg: "rgba(90, 26, 255, 0.1)",
          },
        },
        ghost: {
          color: "whiteAlpha.900",
          _hover: {
            bg: "whiteAlpha.100",
          },
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: "whiteAlpha.300",
            bg: "whiteAlpha.50",
            _hover: {
              borderColor: "primary.300",
            },
            _focus: {
              borderColor: "primary.500",
              boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
            },
          },
        },
      },
    },
    Textarea: {
      variants: {
        outline: {
          borderColor: "whiteAlpha.300",
          bg: "whiteAlpha.50",
          _hover: {
            borderColor: "primary.300",
          },
          _focus: {
            borderColor: "primary.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)",
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          bg: "dark.200",
          boxShadow: "xl",
          borderRadius: "lg",
          border: "1px solid",
          borderColor: "whiteAlpha.100",
        },
        header: {
          borderBottomWidth: "1px",
          borderColor: "whiteAlpha.100",
        },
      },
    },
  },
  layerStyles: {
    card: {
      bg: "rgba(33, 34, 44, 0.7)",
      borderRadius: "xl",
      boxShadow: "lg",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
    },
  },
  glassmorphism: {
    card: {
      bg: "rgba(33, 34, 44, 0.7)",
      backdropFilter: "blur(10px)",
      borderRadius: "xl",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.08)",
    },
  },
});
