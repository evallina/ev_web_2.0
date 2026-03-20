import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Enol Vallina | Profile',
  description: 'Professional profile of Enol Vallina — multidisciplinary designer with 13+ years across architecture, urbanism, computational design, and interactive systems.',
  robots: { index: true, follow: true },
};

export default function ProfilePage() {
  return (
    <main style={{
      maxWidth: 720,
      margin: '0 auto',
      padding: '3rem 1.5rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#1c1c1d',
      lineHeight: 1.7,
      background: '#ffffff',
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Enol Vallina</h1>
      <p style={{ fontSize: '1rem', color: '#666', marginBottom: '2rem' }}>Multidisciplinary Designer · Architect · Researcher · Seattle, WA</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>About</h2>
        <p>Multidisciplinary designer with 13+ years of experience across architecture, urbanism, computational design, and interactive systems. Background spans buildings and urban masterplans to parametric tools, data visualizations, and public installations — developed at globally recognized practices including Heatherwick Studio, SOM, and LMN Architects. Combines research-driven methods with cross-scale design thinking to shape outcomes that are technically rigorous, context-aware, and communicatively precise.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Practice Categories</h2>
        <p><strong>Computational Design</strong> — Building computational tools, parametric systems, and analytical workflows that extend design intelligence. Urban analysis platforms, parametric envelope systems, data pipelines, and feasibility tools.</p>
        <p><strong>Artifacts & Interfaces</strong> — Tangible, experiential outputs at the intersection of physical and digital. Installations, interactive prototypes, and sensory systems that bridge materiality and computation.</p>
        <p><strong>Public Realm</strong> — Improving shared urban environments through interventions across scales. Campus masterplans, highway lid parks, streetscape redesigns, and public space frameworks.</p>
        <p><strong>Architecture</strong> — Building-scale projects from concept through construction. Convention centers, university buildings, residential renovations, and transit stations.</p>
        <p><strong>Futures</strong> — Forward-looking work that defines direction before delivery. Competition entries, feasibility visions, organizational proposals, and speculative conceptualizations.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Professional Experience</h2>
        <p><strong>LMN Architects</strong> — Architect, Urban Designer & Researcher · Seattle, WA · 2017–2025</p>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.75rem' }}>Led design across project phases on buildings, transit infrastructure, and urban masterplans ranging from 30,000 to 240,000+ sqm. Founded and led research initiatives within the in-house Tech Studio, developing data-driven urban analysis frameworks, interactive prototypes, and public engagement tools. Authored parametric design tools and computational workflows applied across multiple project types.</p>

        <p><strong>Thomas Heatherwick Studio</strong> — Architect, Urban Designer · London, UK · 2014–2015</p>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.75rem' }}>Developed urban strategies and stakeholder engagement visuals for district-scale campus projects. Conducted comprehensive design research on commuting experience and mobility systems.</p>

        <p><strong>Skidmore, Owings & Merrill (SOM)</strong> — Urban Designer · London, UK · 2010–2014</p>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.75rem' }}>Led regional-scale analysis, masterplan coordination, and design development across urban regeneration, campus planning, and environmental conservation projects. Coordinated multidisciplinary consultant teams and managed feasibility studies.</p>

        <p><strong>Freelance Architect</strong> — UK & Spain · 2006–2014</p>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.75rem' }}>Designed and constructed residential and commercial projects. Conducted feasibility studies and proposed designs for prefabricated hotel units.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Education</h2>
        <p><strong>Harvard University, Graduate School of Design</strong> — Master in Design Studies, Technology · 2015–2017</p>
        <p><strong>University College London, Bartlett School of Architecture</strong> — MArch Urban Design · 2009–2010</p>
        <p><strong>Universitat Ramon Llull, ETSALS Barcelona</strong> — BA + MArch Architecture · 2003–2009</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Teaching & Research</h2>
        <p><strong>Thornton Tomasetti AECtech Seattle</strong> — Lecturer, Masterclass on Computational Urban Analysis · 2023</p>
        <p><strong>University of Washington, Architecture School</strong> — Studio Instructor & Visiting Lecturer · 2017–2023</p>
        <p><strong>Harvard GSD</strong> — Teaching Assistant, Landscape Design Studio · 2017</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Technical Skills</h2>
        <p><strong>Computational & Data:</strong> Grasshopper (advanced), Python, Web Development (Next.js, TypeScript, Three.js, WebGL), Unity3D</p>
        <p><strong>Design & Visualization:</strong> Rhino 3D, Revit, QGIS/ArcGIS, Adobe Suite, After Effects, Premiere Pro, Cinema 4D, Figma</p>
        <p><strong>Fabrication:</strong> 3D Printing (SLS, FDM, SLA), Laser Cutting, CNC/Rhino CAM, Woodworking</p>
        <p><strong>Other:</strong> UAV Remote Pilot Certification, PointCloud Scanning, Photography</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Awards & Recognition</h2>
        <p>Amsterdam Light Festival Installation — Selected (2020)</p>
        <p>Real Colegio Complutense in Harvard Fellow — Graduate Scholarship (2016)</p>
        <p>AIA Award for Regional & Urban Design — Son Tra Peninsula, SOM (2014)</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Professional Registrations</h2>
        <p>Architect License, Spain — COAAs</p>
        <p>Architect License, UK — ARB</p>
      </section>

      <section>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contact</h2>
        <p>Email: hello@enolvallina.com</p>
        <p>LinkedIn: linkedin.com/in/enolvallina</p>
        <p>Portfolio: enolvallina.com</p>
      </section>

      <footer style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', fontSize: '0.8rem', color: '#999' }}>
        <p>This page provides a machine-readable professional summary. Visit <a href="https://enolvallina.com" style={{ color: '#666' }}>enolvallina.com</a> for the full interactive portfolio.</p>
      </footer>
    </main>
  );
}
