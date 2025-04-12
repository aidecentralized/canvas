// client/src/theme.ts
import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

// Define the theme configuration
const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

// Define the crimson color palette
const colors = {
  crimson: {
    50: "#ffe5e9",
    100: "#fabbcb",
    200: "#f590ad",
    300: "#f0658e",
    400: "#eb3a70",
    500: "#d22152",
    600: "#a41840",
    700: "#771030",
    800: "#4a0820",
    900: "#200010",
  },
};

// Create glassmorphism styles
const glassmorphism = {
  backgroundFilter: {
    backdropFilter: "blur(10px)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "10px",
  },
  card: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.18)",
  },
};

// Custom theme definition
const theme = extendTheme({
  config,
  colors,
  styles: {
    global: {
      body: {
        fontFamily: "Inter, system-ui, sans-serif",
        color: "white",
        lineHeight: "tall",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "md",
      },
      variants: {
        solid: {
          bg: "crimson.500",
          color: "white",
          _hover: {
            bg: "crimson.600",
          },
        },
        outline: {
          color: "crimson.500",
          borderColor: "crimson.500",
          _hover: {
            bg: "rgba(210, 33, 82, 0.1)",
          },
        },
        ghost: {
          color: "white",
          _hover: {
            bg: "rgba(255, 255, 255, 0.1)",
          },
        },
      },
      defaultProps: {
        variant: "solid",
      },
    },
    Input: {
      variants: {
        glass: {
          field: {
            bg: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: "md",
            color: "white",
            _placeholder: {
              color: "rgba(255, 255, 255, 0.5)",
            },
            _focus: {
              borderColor: "crimson.300",
              boxShadow: "0 0 0 1px rgba(210, 33, 82, 0.6)",
            },
          },
        },
      },
      defaultProps: {
        variant: "glass",
      },
    },
    Textarea: {
      variants: {
        glass: {
          bg: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          borderRadius: "md",
          color: "white",
          _placeholder: {
            color: "rgba(255, 255, 255, 0.5)",
          },
          _focus: {
            borderColor: "crimson.300",
            boxShadow: "0 0 0 1px rgba(210, 33, 82, 0.6)",
          },
        },
      },
      defaultProps: {
        variant: "glass",
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          ...glassmorphism.card,
          bg: "rgba(26, 32, 44, 0.8)",
          color: "white",
        },
      },
    },
  },
  // Custom glassmorphism styles that can be accessed globally
  glassmorphism,
});

export default theme;
