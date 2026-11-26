import type { ActivityType } from "@/types/academic";

/** Copy of the pedagogical type in Spanish, used by badges, filters and selectors. */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  TAREA: "Tarea",
  ACTIVIDAD: "Actividad",
  TALLER: "Taller",
  PROYECTO: "Proyecto",
};

/**
 * Small badge that shows the pedagogical type of an activity (`TAREA` = home work,
 * `ACTIVIDAD` = in-class work). The label is Spanish because it is UI copy.
 */
export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const label = ACTIVITY_TYPE_LABELS[type] ?? type;
  return <span className={`type-badge type-${type.toLowerCase()}`}>{label}</span>;
}
