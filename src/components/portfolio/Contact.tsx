import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy, MapPin } from "lucide-react";
import { GitHubIcon as Github } from "@/components/icons/GitHubIcon";
import { LinkedInIcon as Linkedin } from "@/components/icons/LinkedInIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { EMAIL_DISPLAY, GITHUB_URL, LINKEDIN_URL, LOCATION, MAILTO_URL, WHATSAPP_URL } from "@/data/contact";
import { FadeUp, Magnetic, RevealWords, SectionLabel } from "./Reveal";

const socials = [
  { icon: Github, label: "GitHub", href: GITHUB_URL },
  { icon: Linkedin, label: "LinkedIn", href: LINKEDIN_URL },
  { icon: WhatsAppIcon, label: "WhatsApp", href: WHATSAPP_URL },
];

export const Contact = () => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL_DISPLAY);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions, insecure context): fall back to the mail app.
      window.location.href = MAILTO_URL;
    }
  };

  return (
    <section id="contact" className="py-32 relative">
      <div className="container max-w-6xl">
        <SectionLabel index="04">Contato</SectionLabel>
        <h2 className="font-display font-semibold tracking-tight leading-[0.95] text-[clamp(2.75rem,9vw,8.5rem)] mb-10">
          <RevealWords text={"Tem um projeto\nem mente?"} />
          <RevealWords text="*Vamos construir.*" delay={0.2} />
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-20 items-end">
          <FadeUp delay={0.1}>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Aberto para estágios, oportunidades em tecnologia e colaborações em projetos.{" "}
              <span className="text-foreground font-medium">Disponibilidade para início imediato.</span> Resposta
              rápida garantida.
            </p>
            <p className="flex items-center gap-2 text-sm text-muted-foreground mt-6">
              <MapPin className="w-4 h-4" aria-hidden />
              {LOCATION}
            </p>
          </FadeUp>

          <FadeUp delay={0.2} className="flex flex-col items-start lg:items-end gap-4">
            <div className="flex flex-wrap items-stretch gap-3">
              <Magnetic strength={0.2}>
                <a
                  href={MAILTO_URL}
                  data-cursor="→"
                  className="group relative inline-flex items-center gap-3 px-7 py-5 border border-foreground overflow-hidden"
                >
                  <span className="absolute inset-0 bg-foreground scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500 ease-out" />
                  <span className="relative text-foreground group-hover:text-background font-medium text-base md:text-lg transition-colors duration-300 break-all">
                    {EMAIL_DISPLAY}
                  </span>
                  <ArrowUpRight className="relative w-5 h-5 shrink-0 text-foreground group-hover:text-background transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </a>
              </Magnetic>
              <button
                type="button"
                onClick={copyEmail}
                aria-label="Copiar e-mail"
                data-cursor=""
                className="inline-flex items-center gap-2 px-5 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all min-h-[3.25rem]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span aria-live="polite">{copied ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="→"
                  className="group flex items-center gap-2 px-5 py-3 border border-border hover:border-primary/50 transition-all"
                >
                  <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </a>
              ))}
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
};
