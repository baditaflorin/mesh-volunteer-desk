import { useState } from "react";
import {
  useRoomCapacity,
  useSharedQueue,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";
type Props = { room: YRoom | null; config: MeshConfig };
type Shift = { label: string };
export function Feature({ room, config }: Props) {
  const desk = useRoomCapacity(room, "volunteer-desk", { capacity: 3, ttlMs: 15 * 60_000 });
  const queue = useSharedQueue<Shift>(room, "volunteer-shifts");
  const [label, setLabel] = useState("");
  const add = () => {
    const clean = label.trim().slice(0, 80);
    if (clean) {
      queue.enqueue({ label: clean });
      setLabel("");
    }
  };
  return (
    <main className="feature-placeholder">
      <p className="feature-status">
        {room ? `${room.peerCount} peer(s) connected` : "Connecting…"}
      </p>
      <h1>{config.appName}</h1>
      <p>
        A small, claim-safe volunteer desk. Join a three-person desk, then take one queued shift at
        a time.
      </p>
      <p aria-live="polite">
        {desk.admitted
          ? "You have a desk slot."
          : desk.waitlisted
            ? `Waitlisted at #${desk.position}.`
            : `${desk.remaining} desk slot(s) open.`}
      </p>
      <button onClick={desk.join}>Join desk</button>
      <button onClick={desk.leave}>Leave desk</button>
      <div>
        <label>
          New shift{" "}
          <input value={label} maxLength={80} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <button onClick={add}>Add shift</button>
        <button onClick={queue.claimNext} disabled={!desk.admitted || queue.pending === 0}>
          Claim next
        </button>
      </div>
      <ol>
        {queue.entries.map((entry) => (
          <li key={entry.id}>
            {entry.payload.label} · {entry.claimedBy ? "in progress" : "waiting"}
            {entry.claimedBy === room?.peerId && (
              <>
                <button onClick={() => queue.acknowledge(entry.id)}>Complete</button>
                <button onClick={() => queue.release(entry.id)}>Release</button>
              </>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
