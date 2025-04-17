// client/src/types/resource.ts
/**
 * Resource interfaces based on the Model Context Protocol specification
 */

/**
 * Represents a concrete resource that can be accessed by URI
 */
export interface Resource {
  uri: string;         // Unique identifier for the resource
  name: string;        // Human-readable name
  description?: string; // Optional description
  mimeType?: string;   // Optional MIME type
}

/**
 * Represents a URI template for constructing valid resource URIs
 */
export interface ResourceTemplate {
  uriTemplate: string; // URI template following RFC 6570
  name: string;        // Human-readable name for this type
  description?: string; // Optional description
  mimeType?: string;   // Optional MIME type for all matching resources
}

/**
 * Represents the content of a resource
 */
export interface ResourceContent {
  uri: string;        // The URI of the resource
  mimeType?: string;  // Optional MIME type
  text?: string;      // For text resources
  blob?: string;      // For binary resources (base64 encoded)
}

/**
 * Represents a resource update notification
 */
export interface ResourceUpdateNotification {
  serverId: string;   // The ID of the server that owns the resource
  uri: string;        // The URI of the updated resource
}