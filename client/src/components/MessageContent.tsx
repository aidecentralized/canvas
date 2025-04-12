// client/src/components/MessageContent.tsx
import React from "react";
import { Box, Text, Image, Flex, Icon } from "@chakra-ui/react";
import { FaInfoCircle, FaTools } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface ContentItem {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  data?: string; // Added data property for image content type
}

interface MessageContentProps {
  content: ContentItem | ContentItem[];
}

// Define types for ReactMarkdown components
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Define type for anchor props
interface AnchorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  node?: any; // Keep node as any for simplicity, or use a more specific type from markdown AST if needed
  children?: React.ReactNode;
}

const MessageContent: React.FC<MessageContentProps> = ({ content }) => {
  // If content is not an array, convert it to array for consistent handling
  const contentArray = Array.isArray(content) ? content : [content];

  return (
    <Box>
      {contentArray.map((item, index) => {
        if (item.type === "text" && item.text) {
          return (
            <Box key={index}>
              <ReactMarkdown
                components={{
                  code: ({
                    node,
                    inline,
                    className,
                    children,
                    ...props
                  }: CodeProps) => {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={atomDark}
                        language={match[1]}
                        PreTag="div"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <Text mb={2}>{children}</Text>;
                  },
                  a({ node, children, ...props }: AnchorProps) { // Add type AnchorProps
                    return (
                      <a
                        style={{ color: "#f06", textDecoration: "underline" }}
                        {...props} // Spread remaining props (like href, target)
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {item.text}
              </ReactMarkdown>
            </Box>
          );
        } else if (item.type === "image") {
          return (
            <Box key={index} my={2}>
              <Image
                src={`data:image/jpeg;base64,${item.data}`}
                alt="Image"
                borderRadius="md"
                maxW="100%"
              />
            </Box>
          );
        } else if (item.type === "tool_use") {
          return (
            <Box
              key={index}
              mt={2}
              p={3}
              borderRadius="md"
              bg="rgba(0, 0, 0, 0.2)"
              border="1px solid rgba(255, 255, 255, 0.1)"
            >
              <Flex align="center" mb={2}>
                <Icon as={FaTools} mr={2} color="crimson.300" />
                <Text fontWeight="bold">Using tool: {item.name}</Text>
              </Flex>
              <Box
                as="pre"
                p={2}
                borderRadius="md"
                bg="rgba(0, 0, 0, 0.3)"
                fontSize="sm"
                overflowX="auto"
              >
                {JSON.stringify(item.input, null, 2)}
              </Box>
            </Box>
          );
        } else {
          // Default case for unknown content types
          return (
            <Box
              key={index}
              p={2}
              borderRadius="md"
              bg="rgba(0, 0, 0, 0.2)"
              mt={2}
            >
              <Flex align="center">
                <Icon as={FaInfoCircle} mr={2} color="yellow.300" />
                <Text fontStyle="italic">
                  Unsupported content type: {item.type}
                </Text>
              </Flex>
            </Box>
          );
        }
      })}
    </Box>
  );
};

export default MessageContent;
