import { describe, it, expect } from "vitest";
import { isLeaseValid, isLeaseOwner, validateLease } from "./lease.js";
import type { Lease } from "./lease.js";
import { createDocId, createActorId, createSessionId, createLeaseId } from "../types/ids.js";

const makeLease = (overrides?: Partial<Lease>): Lease => ({
  docId: createDocId("doc-1"),
  actorId: createActorId("actor-1"),
  sessionId: createSessionId("sess-1"),
  leaseId: createLeaseId("lease-1"),
  acquiredAt: 1000,
  expiresAt: 2000,
  ...overrides,
});

describe("isLeaseValid", () => {
  it("returns true when lease has not expired", () => {
    expect(isLeaseValid(makeLease(), 1500)).toBe(true);
  });

  it("returns false when lease has expired", () => {
    expect(isLeaseValid(makeLease(), 2500)).toBe(false);
  });

  it("returns false at exact expiry time", () => {
    expect(isLeaseValid(makeLease(), 2000)).toBe(false);
  });
});

describe("isLeaseOwner", () => {
  it("returns true for matching actor and session", () => {
    expect(isLeaseOwner(makeLease(), createActorId("actor-1"), createSessionId("sess-1"))).toBe(
      true,
    );
  });

  it("returns false for mismatched actor", () => {
    expect(isLeaseOwner(makeLease(), createActorId("actor-2"), createSessionId("sess-1"))).toBe(
      false,
    );
  });

  it("returns false for mismatched session", () => {
    expect(isLeaseOwner(makeLease(), createActorId("actor-1"), createSessionId("sess-2"))).toBe(
      false,
    );
  });
});

describe("validateLease", () => {
  it("returns true when all fields match and lease is valid", () => {
    expect(
      validateLease(
        makeLease(),
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        1500,
      ),
    ).toBe(true);
  });

  it("returns false when lease ID does not match", () => {
    expect(
      validateLease(
        makeLease(),
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-2"),
        1500,
      ),
    ).toBe(false);
  });

  it("returns false when lease has expired", () => {
    expect(
      validateLease(
        makeLease(),
        createActorId("actor-1"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        3000,
      ),
    ).toBe(false);
  });

  it("returns false when actor does not match", () => {
    expect(
      validateLease(
        makeLease(),
        createActorId("actor-2"),
        createSessionId("sess-1"),
        createLeaseId("lease-1"),
        1500,
      ),
    ).toBe(false);
  });
});
