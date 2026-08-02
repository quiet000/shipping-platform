"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Truck,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Mail,
  LogIn,
  Search,
  Boxes,
  Headphones,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const navLinks = [
  { label: "عن الشركة", href: "#about" },
  { label: "خدماتنا", href: "#services" },
  { label: "الشركاء", href: "#partners" },
  { label: "اتصل بنا", href: "#contact" },
];

const services = [
  {
    icon: Package,
    title: "شحن سريع ومضمون",
    desc: "خدمات شحن أرضي سريع ومؤمّن عبر شبكة تغطي معظم المدن والمحافظات.",
  },
  {
    icon: Boxes,
    title: "تتبع لحظي",
    desc: "تابع شحنتك لحظة بلحظة من لحظة الاستلام وحتى التسليم النهائي.",
  },
  {
    icon: ShieldCheck,
    title: "التحصيل عند الاستلام",
    desc: "خدمة الدفع عند الاستلام (COD) مع تحصيل مضمون وتصفية أسبوعية.",
  },
  {
    icon: Clock,
    title: "توصيل في الموعد",
    desc: "نلتزم بالمواعيد المحددة للتسليم مع نظام إنذارات لمتابعة أي تأخير.",
  },
];

const partners = [
  "شركة النور للتجارة",
  "مؤسسة المستقبل",
  "سوق الإلكترونيات",
  "مجموعة الشرق",
  "مخازن المدينة",
  "توزيع بريميوم",
];

export default function LandingPage() {
  const router = useRouter();
  const [waybill, setWaybill] = useState("");
  const [error, setError] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const submitTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waybill.trim()) {
      setError(true);
      return;
    }
    router.push(`/track/${encodeURIComponent(waybill.trim())}`);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all ${
          scrolled
            ? "border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/90"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 dark:bg-blue-600">
              <Truck className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-lg font-black text-navy-900 dark:text-white">شحن إكسبريس</p>
              <p className="-mt-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                لوجستيات وتوصيل سريع
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-semibold text-slate-600 transition hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="accent" size="sm">
                <LogIn className="h-4 w-4" />
                تسجيل دخول الموظفين
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero + Tracking */}
      <section className="relative overflow-hidden bg-navy-950 pb-20 pt-32 sm:pt-36">
        <div className="absolute inset-0">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="text-center lg:text-right">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent">
              <ShieldCheck className="h-4 w-4" />
              شبكة توصيل تغطي كل المحافظات
            </span>
            <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-5xl">
              تتبع شحنتك
              <span className="mx-2 bg-gradient-to-l from-accent to-accent-light bg-clip-text text-transparent">
                لحظة بلحظة
              </span>
              وبكل سهولة
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-slate-300 lg:mx-0">
              منصة شحن لوجستية متكاملة تتيح لك تتبع شحناتك ومعرفة موعد التوصيل المتوقع في أي وقت ومن أي مكان.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500/15">
                  <Package className="h-5 w-5 text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">+25 ألف</p>
                  <p className="text-xs text-slate-400">شحنة تم تسليمها</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/15">
                  <MapPin className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">27 محافظة</p>
                  <p className="text-xs text-slate-400">نغطيها يومياً</p>
                </div>
              </div>
            </div>
          </div>

          <Card className="p-6 shadow-2xl sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/15">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">تتبع شحنتك الآن</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  أدخل رقم البوليصة لمعرفة حالة شحنتك
                </p>
              </div>
            </div>

            <form onSubmit={submitTrack} className="space-y-3">
              <div className="relative">
                <Input
                  dir="ltr"
                  placeholder="SHP-849201"
                  value={waybill}
                  onChange={(e) => {
                    setWaybill(e.target.value);
                    setError(false);
                  }}
                  className={`h-12 text-center text-base font-bold tracking-wider placeholder:font-normal ${
                    error ? "border-red-500 focus:border-red-500" : ""
                  }`}
                />
              </div>
              {error && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  من فضلك أدخل رقم البوليصة أولاً.
                </p>
              )}
              <Button type="submit" variant="accent" size="lg" className="w-full">
                <Search className="h-5 w-5" />
                تتبع الآن
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              مثال: جرّب رقم البوليصة <span className="font-bold ltr">SHP-849201</span>
            </p>
          </Card>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">خدماتنا</span>
          <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
            حلول لوجستية متكاملة لعملك
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            نقدم خدمات شحن وتوصيل تناسب الشركات والمتاجر الإلكترونية والأفراد.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.title} className="group p-6 transition hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-900 text-accent transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-600">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-bold text-slate-800 dark:text-slate-100">{s.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-white py-20 dark:bg-slate-900/50">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-l from-blue-600/20 to-accent/20 blur-2xl" />
            <div className="relative grid grid-cols-2 gap-4">
              {[
                { n: "2015", t: "سنة التأسيس" },
                { n: "120+", t: "مندوب وسائق" },
                { n: "60+", t: "شاحنة" },
                { n: "300+", t: "شركة شريكة" },
              ].map((x) => (
                <Card key={x.t} className="p-6 text-center">
                  <p className="text-3xl font-black text-navy-900 dark:text-white">{x.n}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{x.t}</p>
                </Card>
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">عن الشركة</span>
            <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white sm:text-4xl">
              شريكك الموثوق في عالم الشحن
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">
              نحن شركة متخصصة في خدمات الشحن والتوصيل اللوجستي، نعمل على مدار الساعة لضمان وصول
              شحناتك بأمان وفي الوقت المحدد. نستخدم أحدث التقنيات في التتبع وإدارة الأسطول لنقدم لك
              تجربة شحن سلسة وشفافة.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "تغطية واسعة لجميع المحافظات",
                "أسطول حديث ومؤمّن بالكامل",
                "دعم فني على مدار الساعة",
                "تصفية مالية أسبوعية للشركاء",
              ].map((x) => (
                <li key={x} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">شركاؤنا</span>
          <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            شركاء نجاحنا في التوزيع
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {partners.map((p) => (
            <Card
              key={p}
              className="flex items-center justify-center p-5 text-center text-sm font-bold text-slate-600 transition hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
            >
              {p}
            </Card>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-navy-950 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-black text-white sm:text-4xl">اتصل بنا</h2>
            <p className="mt-3 text-slate-400">فريقنا جاهز للرد على استفساراتك في أي وقت</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Phone, t: "الهاتف", v: "19599" },
              { icon: Mail, t: "البريد الإلكتروني", v: "info@ship-express.com" },
              { icon: MapPin, t: "الفرع الرئيسي", v: "القاهرة - مدينة نصر" },
            ].map((c) => (
              <Card
                key={c.t}
                className="flex items-center gap-4 border-slate-800 bg-slate-900 p-6 text-white"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-accent/15">
                  <c.icon className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">{c.t}</p>
                  <p className="font-bold ltr:text-left">{c.v}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-navy-950 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-accent" />
            <span className="font-black text-white">شحن إكسبريس</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} شحن إكسبريس لخدمات الشحن اللوجستي. جميع الحقوق محفوظة.
          </p>
          <Link href="/login" className="text-sm text-slate-400 transition hover:text-accent">
            بوابة الموظفين
          </Link>
        </div>
      </footer>
    </div>
  );
}
