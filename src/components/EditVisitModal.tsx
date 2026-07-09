import { useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import type { CrowdLevel, QualityLevel } from "@/hooks/use-outlet-extras";

interface EditVisitModalProps {
  open: boolean;
  onClose: () => void;
  gymName: string;
  visitDate: string;
  note: string;
  rating: number | null;
  crowdLevel: CrowdLevel | null;
  equipmentQuality: QualityLevel | null;
  cleanliness: QualityLevel | null;
  onSave: (data: {
    visitDate: string;
    note: string;
    rating: number | null;
    crowdLevel: CrowdLevel | null;
    equipmentQuality: QualityLevel | null;
    cleanliness: QualityLevel | null;
  }) => void;
}

const CROWD_OPTIONS: CrowdLevel[] = ["Low", "Medium", "High"];
const QUALITY_OPTIONS: QualityLevel[] = ["Poor", "Okay", "Good", "Great"];

export function EditVisitModal({
  open,
  onClose,
  gymName,
  visitDate,
  note,
  rating,
  crowdLevel,
  equipmentQuality,
  cleanliness,
  onSave,
}: EditVisitModalProps) {
  const [date, setDate] = useState(visitDate.slice(0, 10));
  const [noteText, setNoteText] = useState(note);
  const [ratingVal, setRatingVal] = useState<number | null>(rating);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(crowdLevel);
  const [equipment, setEquipment] = useState<QualityLevel | null>(equipmentQuality);
  const [clean, setClean] = useState<QualityLevel | null>(cleanliness);
  const dateInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleSave = () => {
    onSave({
      visitDate: new Date(date).toISOString(),
      note: noteText.trim(),
      rating: ratingVal,
      crowdLevel: crowd,
      equipmentQuality: equipment,
      cleanliness: clean,
    });
    onClose();
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#12172a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 sticky top-0 bg-[#12172a]">
          <div>
            <p className="text-sm font-semibold text-[#f0f2ff]">Edit Visit Details</p>
            <p className="text-[11px] text-[#8896b3] truncate max-w-[240px]">{gymName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8896b3] hover:text-[#f0f2ff] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Field label="Visit date">
            <div className="relative">
              <button
                type="button"
                onClick={openDatePicker}
                className="w-full h-10 bg-white/6 border border-white/10 rounded-lg pl-3 pr-10 text-left text-sm font-semibold text-[#f0f2ff] outline-none hover:border-violet-400/40 focus-visible:border-violet-500/70 focus-visible:ring-2 focus-visible:ring-violet-500/20 transition-all"
              >
                {formatDisplayDate(date)}
              </button>
              <CalendarDays
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-200"
                aria-hidden="true"
              />
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                tabIndex={-1}
                className="sr-only"
              />
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={3}
              placeholder="How was your visit?"
              className="w-full bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-[#c4cfee] resize-none outline-none focus:border-violet-500/50"
            />
          </Field>

          <Field label="Rating (optional)">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingVal(ratingVal === n ? null : n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                    ratingVal !== null && n <= ratingVal
                      ? "bg-amber-500/30 text-amber-300 border border-amber-400/40"
                      : "bg-white/6 text-[#8896b3] border border-white/10 hover:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Crowd level">
            <OptionRow options={CROWD_OPTIONS} value={crowd} onChange={setCrowd} />
          </Field>

          <Field label="Equipment quality">
            <OptionRow options={QUALITY_OPTIONS} value={equipment} onChange={setEquipment} />
          </Field>

          <Field label="Cleanliness">
            <OptionRow options={QUALITY_OPTIONS} value={clean} onChange={setClean} />
          </Field>
        </div>

        <div className="flex gap-2 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/8 text-[#8896b3] hover:bg-white/12 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-all"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8896b3] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            value === opt
              ? "bg-violet-600/40 text-violet-200 border border-violet-400/50"
              : "bg-white/6 text-[#8896b3] border border-white/10 hover:border-white/20"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
