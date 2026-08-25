import { useState, type FormEvent } from "react";
import {
  MeshButton,
  MeshLaunch,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
  useNamedPeer,
  useRoomCapacity,
  useSharedQueue,
  type MeshConfig,
  type SharedQueueEntry,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };

type Assignment = {
  label: string;
  createdBy: string;
};

const DESK_CAPACITY = 3;
const DESK_LEASE_MS = 15 * 60_000;
const CLAIM_LEASE_MS = 20 * 60_000;

function volunteerLabel(peerId: string, nameOf: (id: string) => string | undefined): string {
  return nameOf(peerId) ?? `Volunteer ${peerId.slice(0, 6)}`;
}

function isAvailable(entry: SharedQueueEntry<Assignment>): boolean {
  return (
    entry.claimedBy === null || entry.claimExpiresAt === null || entry.claimExpiresAt <= Date.now()
  );
}

type AssignmentComposerProps = {
  value: string;
  disabled: boolean;
  compact?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function AssignmentComposer({
  value,
  disabled,
  compact = false,
  onChange,
  onSubmit,
}: AssignmentComposerProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form
      className={`assignment-composer${compact ? " assignment-composer-compact" : ""}`}
      aria-label="Post an assignment"
      onSubmit={submit}
    >
      <label className="assignment-composer-label" htmlFor="assignment-label">
        Post an assignment
      </label>
      <div className="assignment-composer-controls">
        <input
          id="assignment-label"
          className="assignment-composer-input"
          value={value}
          maxLength={80}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder="e.g. North gate check-in"
          autoComplete="off"
        />
        <MeshButton
          type="submit"
          variant="secondary"
          size="sm"
          disabled={disabled || !value.trim()}
        >
          Add assignment
        </MeshButton>
      </div>
    </form>
  );
}

type AssignmentCardProps = {
  entry: SharedQueueEntry<Assignment>;
  index: number;
  room: YRoom | null;
  nameOf: (id: string) => string | undefined;
  onComplete: (id: string) => void;
  onRelease: (id: string) => void;
};

function AssignmentCard({
  entry,
  index,
  room,
  nameOf,
  onComplete,
  onRelease,
}: AssignmentCardProps) {
  const mine = entry.claimedBy === room?.peerId;
  const available = isAvailable(entry);
  const claimant = entry.claimedBy ? volunteerLabel(entry.claimedBy, nameOf) : null;
  const creator = entry.payload.createdBy
    ? volunteerLabel(entry.payload.createdBy, nameOf)
    : "A volunteer";
  const status = mine ? "Your assignment" : available ? "Available" : `${claimant} is covering it`;

  return (
    <li className={`assignment-card${mine ? " assignment-card-mine" : ""}`}>
      <div className="assignment-card-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="assignment-card-body">
        <h3>{entry.payload.label}</h3>
        <p>Posted by {creator}</p>
      </div>
      <div className="assignment-card-state">
        <MeshStatusPill tone={mine ? "live" : available ? "success" : "neutral"} dot>
          {status}
        </MeshStatusPill>
        {mine ? (
          <div className="assignment-card-actions">
            <MeshButton size="sm" onClick={() => onComplete(entry.id)}>
              Complete assignment
            </MeshButton>
            <MeshButton size="sm" variant="quiet" onClick={() => onRelease(entry.id)}>
              Return to desk
            </MeshButton>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function Feature({ room, config }: Props) {
  const desk = useRoomCapacity(room, "volunteer-desk", {
    capacity: DESK_CAPACITY,
    ttlMs: DESK_LEASE_MS,
  });
  const queue = useSharedQueue<Assignment>(room, "volunteer-shifts", {
    claimTtlMs: CLAIM_LEASE_MS,
  });
  const { name, setName, myName, nameOf } = useNamedPeer(config, room);
  const [label, setLabel] = useState("");

  const peopleHere = room ? room.peerCount + 1 : 0;
  const presenceState = room ? "connected" : "connecting";
  const presenceLabel = peopleHere === 1 ? "person connected" : "people connected";
  const seatsReserved = desk.members.length;
  const seatSummary = `${seatsReserved} of ${desk.capacity} desk seats reserved`;
  const myAssignment = queue.entries.find((entry) => entry.claimedBy === room?.peerId);
  const canClaim = Boolean(room && desk.admitted && queue.pending > 0 && !myAssignment);

  const addAssignment = () => {
    const clean = label.trim().slice(0, 80);
    if (!clean || !room) return;
    queue.enqueue({ label: clean, createdBy: room.peerId });
    setLabel("");
  };

  const deskTone = desk.admitted ? "live" : desk.waitlisted ? "warning" : "success";
  const deskState = desk.admitted
    ? "You are on desk"
    : desk.waitlisted
      ? `Standby position ${desk.position ?? "–"}`
      : `${desk.remaining} seat${desk.remaining === 1 ? "" : "s"} open`;

  if (!desk.admitted) {
    const waitlisted = desk.waitlisted;
    const headline = waitlisted ? "You are in the standby line." : "Open a working volunteer desk.";
    const promise = waitlisted
      ? "Stay connected while a seat opens. You can still post the next assignment for the crew."
      : "Set your working name, reserve one of three desk seats, then claim assignments as they arrive.";

    return (
      <main className="volunteer-desk volunteer-desk-entry" aria-label="Volunteer desk entry">
        <MeshLaunch
          className="volunteer-launch"
          eyebrow="Shared field coordination"
          heading={headline}
          promise={promise}
          loading={!room}
          connectionHint={
            room ? "This desk syncs directly between the browsers in this room." : undefined
          }
          presence={
            <div className="desk-launch-presence">
              <MeshPresence
                count={peopleHere}
                label={presenceLabel}
                state={presenceState}
                announce="polite"
              />
              <MeshStatusPill tone={deskTone} dot>
                {deskState}
              </MeshStatusPill>
            </div>
          }
          preview={
            <MeshSurface as="section" tone="raised" padding="md" className="desk-entry-panel">
              <div className="desk-entry-panel-header">
                <div>
                  <p className="desk-kicker">Start with the live desk</p>
                  <h2>Reserve, post, then assign.</h2>
                </div>
                <MeshStatusPill tone={room ? "info" : "warning"} dot>
                  {seatSummary}
                </MeshStatusPill>
              </div>

              <MeshNameInput
                value={name}
                onChange={setName}
                label="Your working name"
                placeholder="How should the crew know you?"
                maxLength={32}
                showCounter
                hint="Shared only with people in this room."
              />

              <div className="desk-flow" aria-label="Volunteer desk flow">
                <span className="desk-flow-step">1</span>
                <p>
                  <strong>Reserve a seat</strong>
                  <span>The desk admits three active volunteers at a time.</span>
                </p>
                <span className="desk-flow-step">2</span>
                <p>
                  <strong>Claim in order</strong>
                  <span>Assignments stay visible until the owner completes or returns them.</span>
                </p>
              </div>

              <AssignmentComposer
                value={label}
                disabled={!room}
                compact
                onChange={setLabel}
                onSubmit={addAssignment}
              />
            </MeshSurface>
          }
          primaryAction={{
            label: waitlisted ? "Leave standby" : "Join the desk",
            onClick: waitlisted ? desk.leave : desk.join,
            disabled: !room,
            className: "primary-desk-action",
          }}
        />
      </main>
    );
  }

  return (
    <main className="volunteer-desk volunteer-desk-active" aria-labelledby="volunteer-desk-title">
      <header className="desk-heading">
        <div>
          <p className="desk-kicker">Live field coordination</p>
          <h1 id="volunteer-desk-title">{config.displayName}</h1>
          <p className="desk-heading-copy">
            A small, accountable crew space. Keep assignments moving without a central coordinator.
          </p>
        </div>
        <div className="desk-heading-status" aria-label="Current desk status">
          <MeshPresence
            count={peopleHere}
            label={presenceLabel}
            state={presenceState}
            announce="polite"
          />
          <MeshStatusPill tone="live" dot announce="polite">
            {seatSummary}
          </MeshStatusPill>
        </div>
      </header>

      <div className="desk-workspace">
        <MeshSurface as="section" tone="accent" padding="lg" className="desk-seat-panel">
          <div className="desk-panel-heading">
            <div>
              <p className="desk-kicker">Your desk seat</p>
              <h2>{myName || "Set your working name"}</h2>
            </div>
            <MeshStatusPill tone="live" dot>
              Active volunteer
            </MeshStatusPill>
          </div>

          <MeshNameInput
            value={name}
            onChange={setName}
            label="Working name"
            placeholder="How should the crew know you?"
            maxLength={32}
            showCounter
            hint="Visible to peers in this room and remembered on this browser."
          />

          <dl className="desk-facts">
            <div>
              <dt>Desk lease</dt>
              <dd>15 minutes</dd>
            </div>
            <div>
              <dt>Assignment lease</dt>
              <dd>20 minutes</dd>
            </div>
          </dl>

          <div className="desk-seat-actions">
            <MeshButton variant="secondary" onClick={desk.join}>
              Renew desk seat
            </MeshButton>
            <MeshButton variant="quiet" onClick={desk.leave}>
              Leave desk
            </MeshButton>
          </div>

          <div className="desk-crew" aria-label="Reserved desk seats">
            <p className="desk-crew-label">Crew on desk</p>
            <ul>
              {desk.members.map((member) => (
                <li key={member.peerId}>
                  <span className="desk-crew-marker" aria-hidden="true" />
                  {member.peerId === room?.peerId
                    ? `${myName || "You"} (you)`
                    : volunteerLabel(member.peerId, nameOf)}
                </li>
              ))}
            </ul>
          </div>
        </MeshSurface>

        <MeshSurface as="section" tone="raised" padding="lg" className="desk-board-panel">
          <div className="desk-panel-heading desk-board-heading">
            <div>
              <p className="desk-kicker">Shared assignment board</p>
              <h2>Move the next thing forward.</h2>
            </div>
            <MeshStatusPill tone={queue.pending > 0 ? "success" : "neutral"} dot>
              {queue.pending} ready to claim
            </MeshStatusPill>
          </div>

          <div className="desk-board-command">
            <div>
              <p className="desk-command-label">Next in line</p>
              <p className="desk-command-copy">
                {myAssignment
                  ? "Finish or return your current assignment before taking another."
                  : queue.pending > 0
                    ? "Claim the oldest available assignment for this desk seat."
                    : "Post the next assignment when the team needs coverage."}
              </p>
            </div>
            <MeshButton
              data-testid="claim-next-assignment"
              size="lg"
              onClick={queue.claimNext}
              disabled={!canClaim}
            >
              Claim next assignment
            </MeshButton>
          </div>

          <AssignmentComposer
            value={label}
            disabled={!room}
            onChange={setLabel}
            onSubmit={addAssignment}
          />

          {queue.entries.length ? (
            <ol className="assignment-list" aria-label="Shared assignment queue">
              {queue.entries.map((entry, index) => (
                <AssignmentCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  room={room}
                  nameOf={nameOf}
                  onComplete={queue.acknowledge}
                  onRelease={queue.release}
                />
              ))}
            </ol>
          ) : (
            <div className="assignment-empty" role="status">
              <p>No assignments are waiting.</p>
              <span>Post a concrete need and the next available volunteer can claim it.</span>
            </div>
          )}
        </MeshSurface>
      </div>
    </main>
  );
}
