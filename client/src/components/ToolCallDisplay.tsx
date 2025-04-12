import React from "react";
import {
  Box,
  Text,
  Flex,
  Icon,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  useColorModeValue,
} from "@chakra-ui/react";
import { FaTools, FaCheck, FaExclamationTriangle } from "react-icons/fa";

interface ToolCallProps {
  toolCall: {
    id: string;
    name: string;
    input: any;
    result?: {
      content: any[];
      isError?: boolean;
    };
  };
}

const ToolCallDisplay: React.FC<ToolCallProps> = ({ toolCall }) => {
  const { name, input, result } = toolCall;

  const hasResult = !!result;
  const isError = result?.isError || false;

  // Define colors based on theme mode
  const accordionItemBg = useColorModeValue("gray.50", "rgba(0, 0, 0, 0.15)");
  const accordionButtonHoverBg = useColorModeValue("blackAlpha.50", "rgba(0, 0, 0, 0.1)");
  const accordionPanelBg = useColorModeValue("gray.100", "rgba(0, 0, 0, 0.2)");
  const inputBg = useColorModeValue("blackAlpha.100", "rgba(0, 0, 0, 0.3)");
  const resultBg = useColorModeValue(
    isError ? "red.50" : "blackAlpha.100",
    isError ? "rgba(255, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.3)"
  );
  const textColor = useColorModeValue("gray.600", "gray.300");

  return (
    <Box
      mb={3}
      borderRadius="md"
      borderLeft="3px solid"
      borderLeftColor={
        hasResult ? (isError ? "red.500" : "green.400") : "yellow.400"
      }
      overflow="hidden"
    >
      <Accordion allowToggle defaultIndex={hasResult ? [] : [0]}>
        <AccordionItem>
          <AccordionButton py={2} px={3}>
            <Flex flex="1" align="center">
              <Icon as={FaTools} mr={2} color="crimson.300" />
              <Text fontWeight="bold" mr={2}>
                {name}
              </Text>
              <Badge
                colorScheme={!hasResult ? "yellow" : isError ? "red" : "green"}
                variant="subtle"
                display="flex"
                alignItems="center"
              >
                {!hasResult ? (
                  "Pending"
                ) : isError ? (
                  <>
                    <Icon as={FaExclamationTriangle} boxSize={3} mr={1} />
                    Error
                  </>
                ) : (
                  <>
                    <Icon as={FaCheck} boxSize={3} mr={1} />
                    Success
                  </>
                )}
              </Badge>
            </Flex>
            <AccordionIcon />
          </AccordionButton>

          <AccordionPanel p={3}>
            {/* Input */}
            <Box mb={hasResult ? 3 : 0}>
              <Text fontWeight="semibold" mb={1} fontSize="sm" color={textColor}>
                Input:
              </Text>
              <Box
                as="pre"
                p={2}
                borderRadius="md"
                fontSize="xs"
                overflowX="auto"
                fontFamily="monospace"
              >
                {JSON.stringify(input, null, 2)}
              </Box>
            </Box>

            {/* Result */}
            {hasResult && (
              <Box>
                <Text
                  fontWeight="semibold"
                  mb={1}
                  fontSize="sm"
                  color={textColor}
                >
                  Result:
                </Text>
                <Box
                  p={2}
                  borderRadius="md"
                  bg={resultBg}
                  fontSize="sm"
                  borderLeft="2px solid"
                  borderLeftColor={isError ? "red.500" : "green.400"}
                >
                  {result.content.map((item, idx) => (
                    <Text key={idx}>
                      {item.type === "text" ? item.text : JSON.stringify(item)}
                    </Text>
                  ))}
                </Box>
              </Box>
            )}
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};

export default ToolCallDisplay;
