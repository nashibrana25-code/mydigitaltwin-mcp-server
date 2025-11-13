'use client';

export default function Resume() {
  return (
    <div className="max-w-4xl mx-auto bg-white text-black shadow-2xl rounded-lg overflow-hidden border border-gray-800">
      {/* Header Section */}
      <div className="bg-black text-white p-8 border-b-2 border-white">
        <h1 className="text-4xl font-bold mb-2">Nashib Rana Magar</h1>
        <p className="text-xl mb-4">2nd Year IT Student | AI Data Analyst Intern</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <a href="mailto:nashibrana25@gmail.com" className="hover:underline">📧 nashibrana25@gmail.com</a>
          <a href="https://github.com/nashibrana25-code" target="_blank" rel="noopener noreferrer" className="hover:underline">💻 GitHub</a>
          <a href="https://www.linkedin.com/in/nashib-magar-708953329/" target="_blank" rel="noopener noreferrer" className="hover:underline">🔗 LinkedIn</a>
          <span>📍 Sydney, Australia</span>
        </div>
      </div>

      {/* Summary */}
      <div className="p-8 border-b">
        <h2 className="text-2xl font-bold mb-4 text-black">Professional Summary</h2>
        <p className="text-gray-700 leading-relaxed">
          Motivated 2nd year IT student with a unique combination of technical IT skills and accounting software expertise. 
          Currently completing a 10-week AI Data Analyst Industry Project Internship building production-ready enterprise 
          applications. Passionate about software development with hands-on experience in Java, Python, PHP, SQL, Docker, 
          and AI/ML technologies.
        </p>
      </div>

      {/* Experience */}
      <div className="p-8 border-b">
        <h2 className="text-2xl font-bold mb-4 text-black">Experience</h2>
        
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-semibold">AI Data Analyst Industry Project Internship</h3>
              <p className="text-gray-600">AI Bootcamp / Industry Project</p>
            </div>
            <span className="text-sm text-gray-500">Oct 2025 - Nov 2025</span>
          </div>
          <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
            <li>Built production-ready Digital Twin MCP Server using Next.js 15, AI/ML, and Docker</li>
            <li>Deployed to Vercel edge network with 100+ global locations</li>
            <li>Implemented enterprise stack: Nginx, Redis, PostgreSQL, Prometheus, Grafana</li>
            <li>Achieved 60% cost reduction through strategic caching while maintaining $0/month operational cost</li>
            <li>Created comprehensive enterprise documentation for security, scalability, and monitoring</li>
          </ul>
        </div>
      </div>

      {/* Education */}
      <div className="p-8 border-b">
        <h2 className="text-2xl font-bold mb-4 text-black">Education</h2>
        
        <div className="mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">Bachelor of Information Technology</h3>
              <p className="text-gray-600">Victoria University, Sydney</p>
            </div>
            <span className="text-sm text-gray-500">2024 - Present (2nd Year)</span>
          </div>
          <p className="text-gray-700 mt-2">Key Projects: Library Management System, Cybersecurity Lab, Web Development</p>
        </div>

        <div>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold">Higher Secondary Education (Science)</h3>
              <p className="text-gray-600">Prasadi Academy, Nepal</p>
            </div>
            <span className="text-sm text-gray-500">2020 - 2022</span>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="p-8 border-b">
        <h2 className="text-2xl font-bold mb-4 text-black">Technical Skills</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">Programming Languages</h3>
            <div className="flex flex-wrap gap-2">
              {['Java', 'Python', 'PHP', 'SQL', 'JavaScript', 'TypeScript'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-black text-white rounded-full text-sm border border-gray-800">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">Technologies & Tools</h3>
            <div className="flex flex-wrap gap-2">
              {['Docker', 'Next.js', 'Git', 'MySQL', 'PostgreSQL', 'Redis', 'Nginx'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-gray-800 text-white rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">AI/ML & Cloud</h3>
            <div className="flex flex-wrap gap-2">
              {['RAG', 'Vector DB', 'LLM Integration', 'Vercel', 'Upstash'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-gray-900 text-white rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2 text-gray-800">DevOps & Monitoring</h3>
            <div className="flex flex-wrap gap-2">
              {['Prometheus', 'Grafana', 'Docker Compose', 'CI/CD'].map((skill) => (
                <span key={skill} className="px-3 py-1 bg-gray-700 text-white rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="p-8 border-b">
        <h2 className="text-2xl font-bold mb-4 text-black">Certifications</h2>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">Accounting Package Certification (CAN Certified)</h3>
            <p className="text-gray-600">BIG Computer Institute, Nepal</p>
          </div>
          <div>
            <h3 className="font-semibold">AI Data Analyst Industry Project (In Progress)</h3>
            <p className="text-gray-600">10-week intensive bootcamp</p>
          </div>
        </div>
      </div>

      {/* Projects */}
      <div className="p-8">
        <h2 className="text-2xl font-bold mb-4 text-black">Key Projects</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Digital Twin MCP Server</h3>
            <p className="text-gray-700">RAG-powered career assistant with enterprise architecture, deployed globally</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Library Management System</h3>
            <p className="text-gray-700">PHP/MySQL application using MVC architecture</p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold">Cybersecurity Lab Environment</h3>
            <p className="text-gray-700">Wazuh SIEM and Snort IDS implementation with 95% threat detection rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
