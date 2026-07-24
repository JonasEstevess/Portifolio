import { motion } from "framer-motion";
import type { MouseEvent } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { GitHubIcon as Github } from "@/components/icons/GitHubIcon";
import { LinkedInIcon as Linkedin } from "@/components/icons/LinkedInIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import {
  GMAIL_COMPOSE_URL,
  EMAIL_DISPLAY,
  WHATSAPP_URL,
  GITHUB_URL,
  LINKEDIN_URL,
  LOCATION,
} from "@/data/contact";

const openExternalLink = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};

const socials = [
  { icon: Github, label: "GitHub", href: GITHUB_URL },
  { icon: Linkedin, label: "LinkedIn", href: LINKEDIN_URL },
  { icon: WhatsAppIcon, label: "WhatsApp", href: WHATSAPP_URL },
];

export const Contact = () => {
  return (
    <section id="contact" className="py-32 relative">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="label-sm text-muted-foreground">Contato</span>
          <h2 className="display-lg mt-4 mb-8">
            Tem um projeto
            <br />
            em mente?
            <br />
            <span className="text-primary">Vamos construir algo.</span>
          </h2>

          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Aberto para estágios, oportunidades em tecnologia e colaborações em projetos.{" "}
            <span className="text-foreground font-medium">Disponibilidade para início imediato.</span>{" "}
            Resposta rápida garantida.
          </p>

          <a
            href={GMAIL_COMPOSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="→"
            className="group relative inline-flex items-center gap-3 px-8 py-5 border border-foreground overflow-hidden mb-4"
          >
            <span className="absolute inset-0 bg-foreground scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-400 ease-out" />
            <span className="relative text-foreground group-hover:text-background font-medium text-lg transition-colors duration-300">
              {EMAIL_DISPLAY}
            </span>
            <ArrowUpRight className="relative w-5 h-5 text-foreground group-hover:text-background transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </a>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-14 mt-6">
            <MapPin className="w-4 h-4" />
            <span>{LOCATION}</span>
          </div>

          <div className="flex flex-wrap gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                  event.preventDefault();
                  openExternalLink(s.href);
                }}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="→"
                className="group flex items-center gap-2 px-5 py-3 border border-border hover:border-primary/40 transition-all"
              >
                <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium text-foreground">{s.label}</span>
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};
