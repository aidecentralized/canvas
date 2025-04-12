// client/src/theme.ts
import { extendTheme, ThemeConfig } from "@chakra-ui/react";
import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools"; // Import mode

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

// Create glassmorphism styles - make them functions of props
const glassmorphism = {
  backgroundFilter: (props: StyleFunctionProps) => ({
    backdropFilter: "blur(10px)",
    backgroundColor: mode("rgba(255, 255, 255, 0.5)", "rgba(26, 32, 44, 0.6)")(props), // Lighter/darker glass
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)", // Shadow might need adjustment too
    border: "1px solid",
    borderColor: mode("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.18)")(props),
    borderRadius: "10px",
  }),
  card: (props: StyleFunctionProps) => ({
    background: mode("rgba(255, 255, 255, 0.6)", "rgba(26, 32, 44, 0.7)")(props), // Adjusted background for light/dark
    backdropFilter: "blur(10px)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
    borderRadius: "10px",
    border: "1px solid",
    borderColor: mode("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.18)")(props),
    color: mode("gray.800", "whiteAlpha.900")(props), // Ensure text color contrasts
  }),
};

// Add theme configuration for color mode
const config: ThemeConfig = {
  initialColorMode: "dark", // Set default mode to dark
  useSystemColorMode: false, // Optional: Set to true to respect user's OS preference
};

// Custom theme definition
export const theme = extendTheme({
  config, // Add the color mode config
  colors,
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        fontFamily: "Inter, system-ui, sans-serif",
        color: mode('gray.800', 'whiteAlpha.900')(props),
        bg: mode('gray.50', 'gray.900')(props), // Use lighter gray for light mode body
        lineHeight: "tall",
      },
      a: {
        color: mode('crimson.600', 'crimson.300')(props),
        _hover: {
          textDecoration: 'underline',
        },
      },
      // Apply base background/color to common layout components if needed
      // Example for Box, Flex, etc. - adjust as necessary
      ".chakra-box, .chakra-flex, .chakra-stack": {
         // bg: mode('white', 'gray.800')(props), // Example: Set default bg - Be careful with overrides
         // color: mode('gray.800', 'whiteAlpha.900')(props), // Example: Set default color
      },
       // Scrollbar styling based on mode
      "::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "::-webkit-scrollbar-track": {
        background: mode("rgba(0, 0, 0, 0.05)", "rgba(255, 255, 255, 0.1)")(props),
        borderRadius: "4px",
      },
      "::-webkit-scrollbar-thumb": {
        background: mode("rgba(0, 0, 0, 0.2)", "rgba(255, 255, 255, 0.2)")(props),
        borderRadius: "4px",
      },
      "::-webkit-scrollbar-thumb:hover": {
        background: mode("rgba(0, 0, 0, 0.3)", "rgba(255, 255, 255, 0.3)")(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "md",
      },
      variants: {
        solid: (props: StyleFunctionProps) => ({
          bg: mode("crimson.600", "crimson.500")(props), // Use mode helper
          color: "white",
          _hover: {
            bg: mode("crimson.700", "crimson.600")(props),
          },
        }),
        outline: (props: StyleFunctionProps) => ({
          color: mode("crimson.600", "crimson.300")(props),
          borderColor: mode("crimson.600", "crimson.300")(props),
          _hover: {
            bg: mode("crimson.50", "rgba(210, 33, 82, 0.1)")(props),
          },
        }),
        ghost: (props: StyleFunctionProps) => ({
          color: mode("gray.700", "whiteAlpha.800")(props),
          _hover: {
            bg: mode("gray.100", "rgba(255, 255, 255, 0.1)")(props),
          },
        }),
      },
      defaultProps: {
        variant: "solid",
      },
    },
    Input: {
      variants: {
        glass: (props: StyleFunctionProps) => ({
          field: {
            bg: mode("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.1)")(props), // Adjusted glass bg
            backdropFilter: "blur(10px)",
            border: "1px solid",
            borderColor: mode("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.18)")(props),
            borderRadius: "md",
            color: mode("gray.800", "white")(props),
            _placeholder: {
              color: mode("gray.500", "rgba(255, 255, 255, 0.5)")(props),
            },
            _focus: {
              borderColor: mode("crimson.500", "crimson.300")(props),
              boxShadow: `0 0 0 1px ${mode('rgba(210, 33, 82, 0.4)', 'rgba(210, 33, 82, 0.6)')(props)}`,
            },
          },
        }),
      },
      defaultProps: {
        variant: "glass",
      },
    },
    Textarea: {
       variants: {
        glass: (props: StyleFunctionProps) => ({
          bg: mode("rgba(255, 255, 255, 0.6)", "rgba(255, 255, 255, 0.1)")(props), // Adjusted glass bg
          backdropFilter: "blur(10px)",
          border: "1px solid",
          borderColor: mode("rgba(0, 0, 0, 0.1)", "rgba(255, 255, 255, 0.18)")(props),
          borderRadius: "md",
          color: mode("gray.800", "white")(props),
          _placeholder: {
            color: mode("gray.500", "rgba(255, 255, 255, 0.5)")(props),
          },
          _focus: {
            borderColor: mode("crimson.500", "crimson.300")(props),
            boxShadow: `0 0 0 1px ${mode('rgba(210, 33, 82, 0.4)', 'rgba(210, 33, 82, 0.6)')(props)}`,
          },
        }),
      },
      defaultProps: {
        variant: "glass",
      },
    },
    Modal: {
      baseStyle: (props: StyleFunctionProps) => ({
        dialog: {
          ...glassmorphism.card(props), // Apply functional glassmorphism style
          // Overrides if needed, e.g., more specific background
          bg: mode("rgba(255, 255, 255, 0.8)", "rgba(26, 32, 44, 0.8)")(props),
          color: mode("gray.800", "white")(props),
        },
        overlay: {
           bg: mode("blackAlpha.400", "blackAlpha.600")(props), // Adjust overlay too
           backdropFilter: "blur(2px)" // Optional: slight blur on overlay
        }
      }),
    },
    // Add styles for other components if needed, e.g., Accordion, Badge
    Accordion: {
        baseStyle: (props: StyleFunctionProps) => ({
            container: {
                border: "none", // Remove default borders if desired
            },
            button: {
                 _hover: {
                    bg: mode("blackAlpha.50", "whiteAlpha.100")(props),
                 }
            },
            panel: {
                 bg: mode("blackAlpha.50", "whiteAlpha.50")(props), // Subtle background for panel
            },
            item: {
                 border: "none",
                 overflow: "hidden", // Ensure rounded corners apply correctly
                 borderRadius: "md",
                 bg: mode("blackAlpha.100", "rgba(0, 0, 0, 0.15)")(props), // Base background for item
                 mb: 3, // Match existing margin
            }
        }),
    },
    Badge: {
        baseStyle: (props: StyleFunctionProps) => ({
            // Ensure badges adapt, especially custom ones
        }),
        variants: {
            // Define variants if needed, e.g., for tool status
            solid: (props: StyleFunctionProps) => ({
                bg: mode(`${props.colorScheme}.500`, `${props.colorScheme}.300`)(props),
                color: mode('white', 'gray.800')(props), // Adjust contrast if needed
            }),
            subtle: (props: StyleFunctionProps) => ({
                bg: mode(`${props.colorScheme}.100`, `${props.colorScheme}.800`)(props),
                color: mode(`${props.colorScheme}.800`, `${props.colorScheme}.200`)(props),
            }),
        }
    },
    Text: { // Ensure default text color respects mode
        baseStyle: (props: StyleFunctionProps) => ({
            color: mode("gray.800", "whiteAlpha.900")(props),
        }),
    },
    Heading: { // Ensure heading color respects mode
        baseStyle: (props: StyleFunctionProps) => ({
            color: mode("gray.900", "white")(props),
        }),
    },
    Divider: { // Ensure divider color respects mode
        baseStyle: (props: StyleFunctionProps) => ({
            borderColor: mode("gray.200", "whiteAlpha.300")(props),
        }),
    },
    // Style for code blocks within Markdown
    Code: {
        baseStyle: (props: StyleFunctionProps) => ({
            bg: mode("gray.100", "rgba(0, 0, 0, 0.3)")(props),
            color: mode("gray.800", "whiteAlpha.800")(props),
            px: "0.2em",
            borderRadius: "sm",
        }),
    },
    // Style for preformatted text (often used with code blocks)
    Pre: {
        baseStyle: (props: StyleFunctionProps) => ({
            bg: mode("gray.100", "rgba(0, 0, 0, 0.3)")(props),
            color: mode("gray.800", "whiteAlpha.800")(props),
            p: 3, // Consistent padding
            borderRadius: "md",
            overflowX: "auto",
            fontSize: "sm", // Consistent font size
            fontFamily: "monospace",
        }),
    },
  },
  // Custom glassmorphism styles that can be accessed globally
  glassmorphism,
});
