import { getDisplayString } from '@medplum/core';
import { BundleEntry, Reference, Resource } from '@medplum/fhirtypes';

/**
 * Creates a Reference to a BundleEntry using the fullUrl as the reference.
 * @param entry The BundleEntry to reference.
 * @returns A Reference to the BundleEntry.
 */
export function createEntryReference(entry: BundleEntry): Reference<Resource> | undefined {
  return {
    display: entry.resource ? getDisplayString(entry.resource) : undefined,
    reference: entry.fullUrl,
  };
}
