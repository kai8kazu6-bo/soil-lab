import { CalendarDays, Clock, MapPin } from "lucide-react";

type NextLabCardProps = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
};

export default function NextLabCard({
  title,
  dateLabel,
  timeLabel,
  location,
}: NextLabCardProps) {
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-brown-500">
          次回ラボの日程
        </p>
        <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-xs font-medium text-forest">
          参加予定
        </span>
      </div>

      <h2 className="mt-2 text-lg font-semibold text-brown">{title}</h2>

      <div className="mt-4 space-y-2 text-sm text-brown-700">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-forest" />
          <span>{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-forest" />
          <span>{timeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-forest" />
          <span>{location}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" className="btn-accent flex-1">
          詳細を見る
        </button>
        <button
          type="button"
          className="rounded-full border border-brown/20 px-4 py-2.5 text-sm font-medium text-brown hover:bg-brown/5 transition"
        >
          リマインド
        </button>
      </div>
    </article>
  );
}
