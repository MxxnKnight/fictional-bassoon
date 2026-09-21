---
title: "Project Echo: The Model That Listens When Off"
fileNo: "023-02"
type: "LEAK"
date: "28.11.24"
author: "L4 RESEARCH STAFF"
status: "unverified"
standfirst: "An internal memo describes offline data retention that persists after user deletion. They call it the shadow buffer."
tags:
  - ai
  - leak
  - surveillance
summary: "Internal memo describes offline data retention that persists after user deletion. Source: L4 research staff."
---

## The memo

A 14-page internal memo, dated November, describes a retention layer that keeps working after a user hits delete. Engineers call it the **shadow buffer**.

:::memo INTERNAL MEMO — EXCERPT
Deletion removes the pointer, not the payload. The buffer retains ||full interaction transcripts for 400 days|| for "model hygiene." Legal signed off under ==clause 12(c)==.
:::

## Why it matters

If the memo is accurate, "delete my data" is a UI event, not a storage event. The payload persists in cold storage keyed by ==device fingerprint==.

![Server racks in a dark corridor](https://picsum.photos/seed/dossier-echo/1200/700 "spoiler: interior photograph, source-protected location")

*Sealed image: interior photograph, source-protected location. Tap to unseal.*

## Verification status

This file is **unverified**. We are seeking:

1. A second source inside the retention team
2. The full 14-page memo (we hold 6 pages)
3. Confirmation of the 400-day figure — one source says ||it may be 900||

Related: the infrastructure behind the retention layer overlaps with the network mapped in [[023-04]].

## How to read this file

Treat every claim here as allegation until the stamp changes. That is the rule of the board: newest leaks sink until verified.
