import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Database,
  Folder,
  KeyRound,
  Layers,
  Terminal,
  ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Folder,
    title: "A place for every object.",
    text: "Organize uploads into buckets. Browse files, inspect metadata, and manage versions from one workspace.",
  },
  {
    icon: KeyRound,
    title: "Access, on your terms.",
    text: "Create scoped API keys for your applications and temporary links for individual transfers.",
  },
  {
    icon: Terminal,
    title: "Built for your workflow.",
    text: "Work with the TypeScript SDK or HTTP API. Keep storage close to the code you already write.",
  },
];

export default function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav wrap">
        <Link href="/" className="wordmark">
          <span className="brand-symbol">
            <Layers size={20} />
          </span>{" "}
          byos<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#workflow">How it works</a>
          <a href="#developers">Developers</a>
        </nav>
        <div className="nav-actions">
          <Link href="/login">Sign in</Link>
          <Link className="action small" href="/signup">
            Start building <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>
      <main>
        <section className="hero wrap">
          <div className="eyebrow">
            <span /> BRING YOUR OWN STORAGE
          </div>
          <h1>
            Your storage.
            <br />A whole new <em>possibility.</em>
          </h1>
          <p>
            Your Google Drive, ready for your next app. Upload, organize, and
            serve files through a developer-friendly API.
          </p>
          <div className="hero-actions">
            <Link className="action" href="/signup">
              Build with BYOS <ArrowUpRight size={18} />
            </Link>
            <a className="text-action" href="#product">
              Take a closer look <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-note">
            Your files stay in your Drive. Your workflow stays yours.
          </div>
          <div className="product-preview" id="product">
            <div className="preview-top">
              <span className="wordmark">
                <Layers size={18} /> byos.
              </span>
              <span>Workspace / Overview</span>
              <span className="demo-label">PRODUCT PREVIEW</span>
            </div>
            <div className="preview-body">
              <aside className="preview-sidebar">
                <span className="preview-workspace">
                  Personal workspace <span>⌄</span>
                </span>
                {["Overview", "Objects", "API keys", "Analytics"].map(
                  (x, i) => (
                    <div className={i === 0 ? "selected" : ""} key={x}>
                      {
                        [
                          <Database size={15} key="d" />,
                          <Folder size={15} key="f" />,
                          <KeyRound size={15} key="k" />,
                          <Layers size={15} key="l" />,
                        ][i]
                      }
                      {x}
                    </div>
                  )
                )}
                <small>CONNECTED STORAGE</small>
                <div>
                  <span className="status-dot" /> Google Drive
                </div>
              </aside>
              <div className="preview-content">
                <div className="preview-heading">
                  <div>
                    <span className="muted">YOUR WORKSPACE, AT A GLANCE</span>
                    <h3>Storage overview</h3>
                  </div>
                  <span className="preview-create">+ Create bucket</span>
                </div>
                <div className="preview-stats">
                  <div>
                    <span>Storage used</span>
                    <strong>
                      2.4 <small>GB</small>
                    </strong>
                    <div className="usage-track">
                      <i />
                    </div>
                    <small>of 15 GB available</small>
                  </div>
                  <div>
                    <span>Total objects</span>
                    <strong>128</strong>
                    <small>Across your workspace</small>
                  </div>
                  <div>
                    <span>Active buckets</span>
                    <strong>3</strong>
                    <small>Connected to Google Drive</small>
                  </div>
                </div>
                <div className="preview-table">
                  <div>
                    <span>BUCKET NAME</span>
                    <span>OBJECTS</span>
                    <span>STATUS</span>
                  </div>
                  {[
                    ["app-assets", "84"],
                    ["user-uploads", "32"],
                    ["documents", "12"],
                  ].map(([name, count]) => (
                    <div key={name}>
                      <span>
                        <Folder size={16} />
                        {name}
                      </span>
                      <span>{count}</span>
                      <span className="connected">
                        Connected <ArrowUpRight size={13} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="integration-strip">
            <span>LESS INFRASTRUCTURE. MORE BUILDING.</span>
            <span>Google Drive</span>
            <span>TypeScript</span>
            <span>HTTP API</span>
            <span>Node.js</span>
          </div>
        </section>
        <section className="wrap feature-section">
          <div className="section-heading">
            <span className="eyebrow">01 / THE PRODUCT</span>
            <h2>
              Small surface.
              <br />
              Room to build.
            </h2>
            <p>
              The storage tools you need, brought together in a workspace that
              stays out of your way.
            </p>
          </div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title}>
                <Icon size={24} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="workflow-section" id="workflow">
          <div className="wrap">
            <span className="eyebrow">02 / FROM DRIVE TO APP</span>
            <h2>
              Less setup.
              <br />
              More shipped.
            </h2>
            <div className="steps">
              {[
                [
                  "01",
                  "Connect your Drive",
                  "Link your Google account and give your app a home for its files.",
                ],
                [
                  "02",
                  "Create a bucket",
                  "Keep assets, uploads, and documents organized by project.",
                ],
                [
                  "03",
                  "Make your first request",
                  "Generate an API key and start building with the SDK.",
                ],
              ].map(([n, t, d]) => (
                <article key={n}>
                  <span>{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="wrap developer-section" id="developers">
          <div>
            <span className="eyebrow">03 / MADE FOR DEVELOPERS</span>
            <h2>
              Feels familiar.
              <br />
              Because it should.
            </h2>
            <p>
              A typed client, clear methods, and files in the storage you
              already use. Start with a single upload.
            </p>
            <Link className="text-action" href="/docs">
              Explore the documentation <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="code-panel">
            <div>
              <span>
                <Terminal size={16} /> upload.ts
              </span>
              <span>TypeScript</span>
            </div>
            <pre>
              <code>{`import { BYOSClient } from "byos-sdk";

const storage = new BYOSClient({
  apiKey: process.env.BYOS_API_KEY!,
  baseUrl: process.env.BYOS_API_URL,
  bucket: "app-assets",
});

await storage.upload(
  "images/cover.png",
  buffer,
);`}</code>
            </pre>
            <footer>
              <ShieldCheck size={14} /> Keep your API key on the server.
            </footer>
          </div>
        </section>
        <section className="wrap faq-section">
          <h2>A few things to know.</h2>
          {[
            [
              "Where do my files live?",
              "Your files are stored in your connected Google Drive. BYOS gives your application an API and a workspace to manage them.",
            ],
            [
              "Do I need a new storage account?",
              "You can connect your existing Google account. Its storage capacity and provider limits still apply.",
            ],
            [
              "How do I get started?",
              "Create a BYOS account, connect Google Drive in Settings, then create a bucket and an API key. The documentation walks through your first request.",
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span>+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </section>
        <section className="closing wrap">
          <span className="eyebrow">YOUR NEXT PROJECT STARTS HERE</span>
          <h2>
            Bring your storage.
            <br />
            Build your thing.
          </h2>
          <Link className="action" href="/signup">
            Get started <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer wrap">
        <Link className="wordmark" href="/">
          byos.
        </Link>
        <span>Storage that works with you.</span>
        <div>
          <Link href="/docs">Documentation</Link>
          <Link href="/login">
            Open console <ArrowUpRight size={14} />
          </Link>
        </div>
      </footer>
    </div>
  );
}
