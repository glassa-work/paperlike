import type { DocId, ActorId, SessionId, LeaseId } from "../types/ids.js";

/** A lease grants single-writer access to a document body */
export interface Lease {
  readonly docId: DocId;
  readonly actorId: ActorId;
  readonly sessionId: SessionId;
  readonly leaseId: LeaseId;
  readonly acquiredAt: number;
  readonly expiresAt: number;
}

/** Check if a lease is currently valid */
export const isLeaseValid = (lease: Lease, now: number): boolean => lease.expiresAt > now;

/** Check if a lease belongs to a given actor and session */
export const isLeaseOwner = (lease: Lease, actorId: ActorId, sessionId: SessionId): boolean =>
  lease.actorId === actorId && lease.sessionId === sessionId;

/** Validate that an operation's lease fields match the active lease */
export const validateLease = (
  lease: Lease,
  actorId: ActorId,
  sessionId: SessionId,
  leaseId: LeaseId,
  now: number,
): boolean =>
  lease.leaseId === leaseId && isLeaseOwner(lease, actorId, sessionId) && isLeaseValid(lease, now);
