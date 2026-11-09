// =====================================================================
// 02_datos_semilla.cypher
// Datos curados de la red profesional (personas y empresas ficticias).
// Es idempotente: usa MERGE, así que se puede ejecutar varias veces
// sin duplicar nodos ni relaciones. Requiere haber corrido 01_esquema.cypher.
// =====================================================================

// ---------- Ciudades ----------
UNWIND [
  {id: 'barranquilla', nombre: 'Barranquilla', departamento: 'Atlántico'},
  {id: 'bogota', nombre: 'Bogotá', departamento: 'Bogotá D.C.'},
  {id: 'medellin', nombre: 'Medellín', departamento: 'Antioquia'},
  {id: 'cali', nombre: 'Cali', departamento: 'Valle del Cauca'},
  {id: 'cartagena', nombre: 'Cartagena', departamento: 'Bolívar'},
  {id: 'monteria', nombre: 'Montería', departamento: 'Córdoba'}
] AS fila
MERGE (c:Ciudad {id: fila.id})
SET c.nombre = fila.nombre, c.departamento = fila.departamento;

// ---------- Habilidades ----------
UNWIND [
  {id: 'react', nombre: 'React', categoria: 'Frontend'},
  {id: 'typescript', nombre: 'TypeScript', categoria: 'Frontend'},
  {id: 'javascript', nombre: 'JavaScript', categoria: 'Frontend'},
  {id: 'angular', nombre: 'Angular', categoria: 'Frontend'},
  {id: 'html-css', nombre: 'HTML/CSS', categoria: 'Frontend'},
  {id: 'nodejs', nombre: 'Node.js', categoria: 'Backend'},
  {id: 'python', nombre: 'Python', categoria: 'Backend'},
  {id: 'java', nombre: 'Java', categoria: 'Backend'},
  {id: 'spring-boot', nombre: 'Spring Boot', categoria: 'Backend'},
  {id: 'django', nombre: 'Django', categoria: 'Backend'},
  {id: 'go', nombre: 'Go', categoria: 'Backend'},
  {id: 'sql', nombre: 'SQL', categoria: 'Datos'},
  {id: 'neo4j', nombre: 'Neo4j', categoria: 'Datos'},
  {id: 'mongodb', nombre: 'MongoDB', categoria: 'Datos'},
  {id: 'power-bi', nombre: 'Power BI', categoria: 'Datos'},
  {id: 'machine-learning', nombre: 'Machine Learning', categoria: 'Datos'},
  {id: 'pandas', nombre: 'Pandas', categoria: 'Datos'},
  {id: 'aws', nombre: 'AWS', categoria: 'Cloud'},
  {id: 'azure', nombre: 'Azure', categoria: 'Cloud'},
  {id: 'docker', nombre: 'Docker', categoria: 'Cloud'},
  {id: 'kubernetes', nombre: 'Kubernetes', categoria: 'Cloud'},
  {id: 'terraform', nombre: 'Terraform', categoria: 'Cloud'},
  {id: 'flutter', nombre: 'Flutter', categoria: 'Móvil'},
  {id: 'kotlin', nombre: 'Kotlin', categoria: 'Móvil'},
  {id: 'figma', nombre: 'Figma', categoria: 'Diseño'},
  {id: 'ux-research', nombre: 'UX Research', categoria: 'Diseño'},
  {id: 'liderazgo', nombre: 'Liderazgo', categoria: 'Blandas'},
  {id: 'scrum', nombre: 'Scrum', categoria: 'Blandas'},
  {id: 'comunicacion', nombre: 'Comunicación', categoria: 'Blandas'}
] AS fila
MERGE (h:Habilidad {id: fila.id})
SET h.nombre = fila.nombre, h.categoria = fila.categoria;

// ---------- Empresas (y su ciudad) ----------
UNWIND [
  {id: 'emp-01', nombre: 'Caribe Software', sector: 'Desarrollo de software', ciudad: 'barranquilla'},
  {id: 'emp-02', nombre: 'Puerto Logística Digital', sector: 'Logística', ciudad: 'cartagena'},
  {id: 'emp-03', nombre: 'AndesData', sector: 'Analítica de datos', ciudad: 'bogota'},
  {id: 'emp-04', nombre: 'FinTrust', sector: 'Fintech', ciudad: 'bogota'},
  {id: 'emp-05', nombre: 'Paisa Cloud', sector: 'Cloud y DevOps', ciudad: 'medellin'},
  {id: 'emp-06', nombre: 'Estudio Pixel', sector: 'Diseño digital', ciudad: 'medellin'},
  {id: 'emp-07', nombre: 'Salud Conectada', sector: 'Healthtech', ciudad: 'cali'},
  {id: 'emp-08', nombre: 'AgroSinú Tech', sector: 'Agrotech', ciudad: 'monteria'}
] AS fila
MERGE (e:Empresa {id: fila.id})
SET e.nombre = fila.nombre, e.sector = fila.sector
WITH e, fila
MATCH (c:Ciudad {id: fila.ciudad})
MERGE (e)-[:UBICADA_EN]->(c);

// ---------- Usuarios (y la ciudad donde viven) ----------
UNWIND [
  {id: 'usr-01', nombre: 'Andrea Pérez', email: 'andrea.perez@example.com', titular: 'Frontend Developer en Caribe Software', ciudad: 'barranquilla', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2025-10-16'},
  {id: 'usr-02', nombre: 'Carlos Mejía', email: 'carlos.mejia@example.com', titular: 'Tech Lead Full Stack', ciudad: 'barranquilla', aniosExperiencia: 9, abiertoAOfertas: false, creadoEn: '2024-04-24'},
  {id: 'usr-03', nombre: 'Valentina Ruiz', email: 'valentina.ruiz@example.com', titular: 'Backend Developer Node.js', ciudad: 'barranquilla', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2024-01-26'},
  {id: 'usr-04', nombre: 'Santiago Herrera', email: 'santiago.herrera@example.com', titular: 'Desarrollador Junior', ciudad: 'barranquilla', aniosExperiencia: 1, abiertoAOfertas: true, creadoEn: '2026-01-29'},
  {id: 'usr-05', nombre: 'Daniela Castro', email: 'daniela.castro@example.com', titular: 'Product Owner', ciudad: 'cartagena', aniosExperiencia: 6, abiertoAOfertas: false, creadoEn: '2024-10-08'},
  {id: 'usr-06', nombre: 'Andrés Gómez', email: 'andres.gomez@example.com', titular: 'Desarrollador Java', ciudad: 'cartagena', aniosExperiencia: 5, abiertoAOfertas: true, creadoEn: '2024-09-07'},
  {id: 'usr-07', nombre: 'Laura Martínez', email: 'laura.martinez@example.com', titular: 'Desarrolladora Móvil', ciudad: 'barranquilla', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2024-08-16'},
  {id: 'usr-08', nombre: 'Felipe Rodríguez', email: 'felipe.rodriguez@example.com', titular: 'DevOps Engineer', ciudad: 'cartagena', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2024-05-22'},
  {id: 'usr-09', nombre: 'Camila Navarro', email: 'camila.navarro@example.com', titular: 'Diseñadora UX/UI', ciudad: 'barranquilla', aniosExperiencia: 2, abiertoAOfertas: true, creadoEn: '2026-01-24'},
  {id: 'usr-10', nombre: 'Jorge Barrios', email: 'jorge.barrios@example.com', titular: 'Full Stack Freelance', ciudad: 'barranquilla', aniosExperiencia: 5, abiertoAOfertas: true, creadoEn: '2024-04-14'},
  {id: 'usr-11', nombre: 'Mariana López', email: 'mariana.lopez@example.com', titular: 'Data Scientist', ciudad: 'bogota', aniosExperiencia: 5, abiertoAOfertas: false, creadoEn: '2025-11-23'},
  {id: 'usr-12', nombre: 'Diego Ramírez', email: 'diego.ramirez@example.com', titular: 'Data Engineer', ciudad: 'bogota', aniosExperiencia: 6, abiertoAOfertas: true, creadoEn: '2026-01-28'},
  {id: 'usr-13', nombre: 'Natalia Vargas', email: 'natalia.vargas@example.com', titular: 'Analista de Datos', ciudad: 'bogota', aniosExperiencia: 2, abiertoAOfertas: true, creadoEn: '2026-07-02'},
  {id: 'usr-14', nombre: 'Sebastián Torres', email: 'sebastian.torres@example.com', titular: 'Backend Developer Java', ciudad: 'bogota', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2025-07-12'},
  {id: 'usr-15', nombre: 'Paula Moreno', email: 'paula.moreno@example.com', titular: 'Engineering Manager', ciudad: 'bogota', aniosExperiencia: 11, abiertoAOfertas: false, creadoEn: '2024-03-30'},
  {id: 'usr-16', nombre: 'Alejandro Suárez', email: 'alejandro.suarez@example.com', titular: 'Machine Learning Engineer', ciudad: 'bogota', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2025-08-27'},
  {id: 'usr-17', nombre: 'Isabella Rojas', email: 'isabella.rojas@example.com', titular: 'Desarrolladora Frontend Angular', ciudad: 'bogota', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2025-03-08'},
  {id: 'usr-18', nombre: 'Mateo Sánchez', email: 'mateo.sanchez@example.com', titular: 'Arquitecto de Datos', ciudad: 'bogota', aniosExperiencia: 8, abiertoAOfertas: false, creadoEn: '2024-02-02'},
  {id: 'usr-19', nombre: 'Sofía Jiménez', email: 'sofia.jimenez@example.com', titular: 'Analista BI recién graduada', ciudad: 'bogota', aniosExperiencia: 1, abiertoAOfertas: true, creadoEn: '2024-01-31'},
  {id: 'usr-20', nombre: 'Nicolás Cárdenas', email: 'nicolas.cardenas@example.com', titular: 'Backend Developer Go', ciudad: 'bogota', aniosExperiencia: 5, abiertoAOfertas: true, creadoEn: '2024-04-05'},
  {id: 'usr-21', nombre: 'Juliana Ospina', email: 'juliana.ospina@example.com', titular: 'Cloud Architect', ciudad: 'medellin', aniosExperiencia: 10, abiertoAOfertas: false, creadoEn: '2024-08-11'},
  {id: 'usr-22', nombre: 'Esteban Restrepo', email: 'esteban.restrepo@example.com', titular: 'Site Reliability Engineer', ciudad: 'medellin', aniosExperiencia: 5, abiertoAOfertas: true, creadoEn: '2024-08-26'},
  {id: 'usr-23', nombre: 'Manuela Zapata', email: 'manuela.zapata@example.com', titular: 'DevOps Engineer', ciudad: 'medellin', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2025-06-01'},
  {id: 'usr-24', nombre: 'Tomás Arango', email: 'tomas.arango@example.com', titular: 'Backend Developer Python', ciudad: 'medellin', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2025-09-08'},
  {id: 'usr-25', nombre: 'Sara Echeverri', email: 'sara.echeverri@example.com', titular: 'Diseñadora de Producto', ciudad: 'medellin', aniosExperiencia: 6, abiertoAOfertas: false, creadoEn: '2024-01-28'},
  {id: 'usr-26', nombre: 'Samuel Correa', email: 'samuel.correa@example.com', titular: 'Frontend Developer React', ciudad: 'medellin', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2025-07-28'},
  {id: 'usr-27', nombre: 'Luisa Henao', email: 'luisa.henao@example.com', titular: 'Desarrolladora Móvil Flutter', ciudad: 'medellin', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2024-07-22'},
  {id: 'usr-28', nombre: 'Daniel Quintero', email: 'daniel.quintero@example.com', titular: 'Director Creativo', ciudad: 'medellin', aniosExperiencia: 9, abiertoAOfertas: false, creadoEn: '2026-01-03'},
  {id: 'usr-29', nombre: 'Gabriela Mesa', email: 'gabriela.mesa@example.com', titular: 'Full Stack Freelance', ciudad: 'medellin', aniosExperiencia: 2, abiertoAOfertas: true, creadoEn: '2025-10-27'},
  {id: 'usr-30', nombre: 'Miguel Ángel Vélez', email: 'miguel.velez@example.com', titular: 'Platform Engineer', ciudad: 'medellin', aniosExperiencia: 7, abiertoAOfertas: false, creadoEn: '2025-12-19'},
  {id: 'usr-31', nombre: 'Carolina Muñoz', email: 'carolina.munoz@example.com', titular: 'CTO en Salud Conectada', ciudad: 'cali', aniosExperiencia: 12, abiertoAOfertas: false, creadoEn: '2025-07-12'},
  {id: 'usr-32', nombre: 'Ricardo Valencia', email: 'ricardo.valencia@example.com', titular: 'Backend Developer', ciudad: 'cali', aniosExperiencia: 4, abiertoAOfertas: true, creadoEn: '2025-03-05'},
  {id: 'usr-33', nombre: 'Ana María Lozano', email: 'ana.lozano@example.com', titular: 'Analista de Datos', ciudad: 'cali', aniosExperiencia: 3, abiertoAOfertas: true, creadoEn: '2024-08-13'},
  {id: 'usr-34', nombre: 'Óscar Bermúdez', email: 'oscar.bermudez@example.com', titular: 'Desarrollador Frontend', ciudad: 'cali', aniosExperiencia: 2, abiertoAOfertas: true, creadoEn: '2025-04-04'},
  {id: 'usr-35', nombre: 'Lina Pertuz', email: 'lina.pertuz@example.com', titular: 'Ingeniera de Software', ciudad: 'monteria', aniosExperiencia: 4, abiertoAOfertas: false, creadoEn: '2025-08-26'},
  {id: 'usr-36', nombre: 'Eduardo Espitia', email: 'eduardo.espitia@example.com', titular: 'Ingeniero de Datos IoT', ciudad: 'monteria', aniosExperiencia: 5, abiertoAOfertas: true, creadoEn: '2024-10-11'},
  {id: 'usr-37', nombre: 'Marcela Doria', email: 'marcela.doria@example.com', titular: 'Product Manager', ciudad: 'monteria', aniosExperiencia: 7, abiertoAOfertas: false, creadoEn: '2026-04-08'},
  {id: 'usr-38', nombre: 'Kevin Petro', email: 'kevin.petro@example.com', titular: 'Desarrollador Junior', ciudad: 'monteria', aniosExperiencia: 1, abiertoAOfertas: true, creadoEn: '2026-06-09'},
  {id: 'usr-39', nombre: 'Valeria Ortiz', email: 'valeria.ortiz@example.com', titular: 'Estudiante de Ingeniería de Sistemas', ciudad: 'barranquilla', aniosExperiencia: 0, abiertoAOfertas: true, creadoEn: '2026-10-20'},
  {id: 'usr-40', nombre: 'Fernando Ríos', email: 'fernando.rios@example.com', titular: 'Desarrollador Backend', ciudad: 'bogota', aniosExperiencia: 2, abiertoAOfertas: true, creadoEn: '2026-10-22'}
] AS fila
MERGE (u:Usuario {id: fila.id})
SET u.nombre = fila.nombre, u.email = fila.email, u.titular = fila.titular,
    u.aniosExperiencia = fila.aniosExperiencia, u.abiertoAOfertas = fila.abiertoAOfertas,
    u.creadoEn = datetime(fila.creadoEn + 'T09:00:00-05:00')
WITH u, fila
MATCH (c:Ciudad {id: fila.ciudad})
MERGE (u)-[:VIVE_EN]->(c);

// ---------- Usuario -[:TIENE_HABILIDAD {nivel}]-> Habilidad ----------
UNWIND [
  {usuario: 'usr-01', habilidad: 'react', nivel: 5},
  {usuario: 'usr-01', habilidad: 'typescript', nivel: 4},
  {usuario: 'usr-01', habilidad: 'html-css', nivel: 5},
  {usuario: 'usr-01', habilidad: 'javascript', nivel: 5},
  {usuario: 'usr-01', habilidad: 'figma', nivel: 3},
  {usuario: 'usr-02', habilidad: 'react', nivel: 4},
  {usuario: 'usr-02', habilidad: 'nodejs', nivel: 5},
  {usuario: 'usr-02', habilidad: 'typescript', nivel: 5},
  {usuario: 'usr-02', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-02', habilidad: 'liderazgo', nivel: 4},
  {usuario: 'usr-02', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-03', habilidad: 'nodejs', nivel: 4},
  {usuario: 'usr-03', habilidad: 'typescript', nivel: 3},
  {usuario: 'usr-03', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-03', habilidad: 'mongodb', nivel: 3},
  {usuario: 'usr-03', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-04', habilidad: 'javascript', nivel: 3},
  {usuario: 'usr-04', habilidad: 'html-css', nivel: 4},
  {usuario: 'usr-04', habilidad: 'react', nivel: 2},
  {usuario: 'usr-04', habilidad: 'sql', nivel: 2},
  {usuario: 'usr-05', habilidad: 'scrum', nivel: 5},
  {usuario: 'usr-05', habilidad: 'comunicacion', nivel: 5},
  {usuario: 'usr-05', habilidad: 'liderazgo', nivel: 4},
  {usuario: 'usr-05', habilidad: 'ux-research', nivel: 3},
  {usuario: 'usr-05', habilidad: 'power-bi', nivel: 3},
  {usuario: 'usr-06', habilidad: 'java', nivel: 5},
  {usuario: 'usr-06', habilidad: 'spring-boot', nivel: 4},
  {usuario: 'usr-06', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-06', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-06', habilidad: 'kubernetes', nivel: 2},
  {usuario: 'usr-07', habilidad: 'flutter', nivel: 4},
  {usuario: 'usr-07', habilidad: 'kotlin', nivel: 3},
  {usuario: 'usr-07', habilidad: 'javascript', nivel: 3},
  {usuario: 'usr-07', habilidad: 'figma', nivel: 2},
  {usuario: 'usr-08', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-08', habilidad: 'docker', nivel: 5},
  {usuario: 'usr-08', habilidad: 'terraform', nivel: 3},
  {usuario: 'usr-08', habilidad: 'kubernetes', nivel: 3},
  {usuario: 'usr-08', habilidad: 'python', nivel: 3},
  {usuario: 'usr-09', habilidad: 'figma', nivel: 5},
  {usuario: 'usr-09', habilidad: 'ux-research', nivel: 4},
  {usuario: 'usr-09', habilidad: 'html-css', nivel: 3},
  {usuario: 'usr-09', habilidad: 'comunicacion', nivel: 4},
  {usuario: 'usr-10', habilidad: 'react', nivel: 4},
  {usuario: 'usr-10', habilidad: 'nodejs', nivel: 4},
  {usuario: 'usr-10', habilidad: 'python', nivel: 3},
  {usuario: 'usr-10', habilidad: 'mongodb', nivel: 3},
  {usuario: 'usr-10', habilidad: 'aws', nivel: 2},
  {usuario: 'usr-10', habilidad: 'typescript', nivel: 3},
  {usuario: 'usr-11', habilidad: 'python', nivel: 5},
  {usuario: 'usr-11', habilidad: 'machine-learning', nivel: 5},
  {usuario: 'usr-11', habilidad: 'pandas', nivel: 5},
  {usuario: 'usr-11', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-11', habilidad: 'power-bi', nivel: 3},
  {usuario: 'usr-12', habilidad: 'python', nivel: 4},
  {usuario: 'usr-12', habilidad: 'sql', nivel: 5},
  {usuario: 'usr-12', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-12', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-12', habilidad: 'neo4j', nivel: 3},
  {usuario: 'usr-13', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-13', habilidad: 'power-bi', nivel: 5},
  {usuario: 'usr-13', habilidad: 'pandas', nivel: 3},
  {usuario: 'usr-13', habilidad: 'python', nivel: 3},
  {usuario: 'usr-13', habilidad: 'comunicacion', nivel: 4},
  {usuario: 'usr-14', habilidad: 'java', nivel: 5},
  {usuario: 'usr-14', habilidad: 'spring-boot', nivel: 5},
  {usuario: 'usr-14', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-14', habilidad: 'kubernetes', nivel: 3},
  {usuario: 'usr-14', habilidad: 'aws', nivel: 3},
  {usuario: 'usr-15', habilidad: 'liderazgo', nivel: 5},
  {usuario: 'usr-15', habilidad: 'scrum', nivel: 4},
  {usuario: 'usr-15', habilidad: 'java', nivel: 4},
  {usuario: 'usr-15', habilidad: 'aws', nivel: 3},
  {usuario: 'usr-15', habilidad: 'comunicacion', nivel: 5},
  {usuario: 'usr-16', habilidad: 'python', nivel: 4},
  {usuario: 'usr-16', habilidad: 'machine-learning', nivel: 4},
  {usuario: 'usr-16', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-16', habilidad: 'go', nivel: 2},
  {usuario: 'usr-16', habilidad: 'sql', nivel: 3},
  {usuario: 'usr-16', habilidad: 'neo4j', nivel: 3},
  {usuario: 'usr-17', habilidad: 'angular', nivel: 4},
  {usuario: 'usr-17', habilidad: 'typescript', nivel: 4},
  {usuario: 'usr-17', habilidad: 'html-css', nivel: 4},
  {usuario: 'usr-17', habilidad: 'javascript', nivel: 4},
  {usuario: 'usr-18', habilidad: 'neo4j', nivel: 5},
  {usuario: 'usr-18', habilidad: 'sql', nivel: 5},
  {usuario: 'usr-18', habilidad: 'mongodb', nivel: 4},
  {usuario: 'usr-18', habilidad: 'python', nivel: 4},
  {usuario: 'usr-18', habilidad: 'liderazgo', nivel: 3},
  {usuario: 'usr-19', habilidad: 'power-bi', nivel: 3},
  {usuario: 'usr-19', habilidad: 'sql', nivel: 3},
  {usuario: 'usr-19', habilidad: 'python', nivel: 2},
  {usuario: 'usr-20', habilidad: 'go', nivel: 5},
  {usuario: 'usr-20', habilidad: 'kubernetes', nivel: 4},
  {usuario: 'usr-20', habilidad: 'docker', nivel: 4},
  {usuario: 'usr-20', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-20', habilidad: 'aws', nivel: 3},
  {usuario: 'usr-20', habilidad: 'terraform', nivel: 4},
  {usuario: 'usr-21', habilidad: 'aws', nivel: 5},
  {usuario: 'usr-21', habilidad: 'azure', nivel: 4},
  {usuario: 'usr-21', habilidad: 'terraform', nivel: 5},
  {usuario: 'usr-21', habilidad: 'kubernetes', nivel: 4},
  {usuario: 'usr-21', habilidad: 'liderazgo', nivel: 4},
  {usuario: 'usr-22', habilidad: 'kubernetes', nivel: 5},
  {usuario: 'usr-22', habilidad: 'docker', nivel: 5},
  {usuario: 'usr-22', habilidad: 'go', nivel: 3},
  {usuario: 'usr-22', habilidad: 'terraform', nivel: 4},
  {usuario: 'usr-22', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-23', habilidad: 'docker', nivel: 4},
  {usuario: 'usr-23', habilidad: 'azure', nivel: 3},
  {usuario: 'usr-23', habilidad: 'python', nivel: 3},
  {usuario: 'usr-23', habilidad: 'terraform', nivel: 3},
  {usuario: 'usr-24', habilidad: 'python', nivel: 4},
  {usuario: 'usr-24', habilidad: 'django', nivel: 5},
  {usuario: 'usr-24', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-24', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-25', habilidad: 'figma', nivel: 5},
  {usuario: 'usr-25', habilidad: 'ux-research', nivel: 5},
  {usuario: 'usr-25', habilidad: 'comunicacion', nivel: 4},
  {usuario: 'usr-25', habilidad: 'html-css', nivel: 3},
  {usuario: 'usr-26', habilidad: 'react', nivel: 4},
  {usuario: 'usr-26', habilidad: 'typescript', nivel: 4},
  {usuario: 'usr-26', habilidad: 'figma', nivel: 3},
  {usuario: 'usr-26', habilidad: 'html-css', nivel: 4},
  {usuario: 'usr-27', habilidad: 'flutter', nivel: 5},
  {usuario: 'usr-27', habilidad: 'kotlin', nivel: 4},
  {usuario: 'usr-27', habilidad: 'figma', nivel: 3},
  {usuario: 'usr-27', habilidad: 'javascript', nivel: 3},
  {usuario: 'usr-28', habilidad: 'liderazgo', nivel: 5},
  {usuario: 'usr-28', habilidad: 'ux-research', nivel: 4},
  {usuario: 'usr-28', habilidad: 'scrum', nivel: 4},
  {usuario: 'usr-28', habilidad: 'comunicacion', nivel: 5},
  {usuario: 'usr-29', habilidad: 'react', nivel: 4},
  {usuario: 'usr-29', habilidad: 'nodejs', nivel: 3},
  {usuario: 'usr-29', habilidad: 'mongodb', nivel: 3},
  {usuario: 'usr-29', habilidad: 'typescript', nivel: 3},
  {usuario: 'usr-30', habilidad: 'kubernetes', nivel: 4},
  {usuario: 'usr-30', habilidad: 'go', nivel: 4},
  {usuario: 'usr-30', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-30', habilidad: 'azure', nivel: 3},
  {usuario: 'usr-31', habilidad: 'liderazgo', nivel: 5},
  {usuario: 'usr-31', habilidad: 'java', nivel: 4},
  {usuario: 'usr-31', habilidad: 'aws', nivel: 4},
  {usuario: 'usr-31', habilidad: 'scrum', nivel: 4},
  {usuario: 'usr-32', habilidad: 'java', nivel: 4},
  {usuario: 'usr-32', habilidad: 'spring-boot', nivel: 4},
  {usuario: 'usr-32', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-32', habilidad: 'nodejs', nivel: 4},
  {usuario: 'usr-32', habilidad: 'mongodb', nivel: 3},
  {usuario: 'usr-33', habilidad: 'python', nivel: 3},
  {usuario: 'usr-33', habilidad: 'pandas', nivel: 4},
  {usuario: 'usr-33', habilidad: 'power-bi', nivel: 4},
  {usuario: 'usr-33', habilidad: 'sql', nivel: 4},
  {usuario: 'usr-33', habilidad: 'neo4j', nivel: 3},
  {usuario: 'usr-34', habilidad: 'angular', nivel: 3},
  {usuario: 'usr-34', habilidad: 'typescript', nivel: 3},
  {usuario: 'usr-34', habilidad: 'html-css', nivel: 4},
  {usuario: 'usr-35', habilidad: 'python', nivel: 4},
  {usuario: 'usr-35', habilidad: 'django', nivel: 4},
  {usuario: 'usr-35', habilidad: 'sql', nivel: 3},
  {usuario: 'usr-35', habilidad: 'flutter', nivel: 3},
  {usuario: 'usr-36', habilidad: 'python', nivel: 5},
  {usuario: 'usr-36', habilidad: 'machine-learning', nivel: 4},
  {usuario: 'usr-36', habilidad: 'sql', nivel: 3},
  {usuario: 'usr-36', habilidad: 'aws', nivel: 3},
  {usuario: 'usr-36', habilidad: 'docker', nivel: 3},
  {usuario: 'usr-37', habilidad: 'scrum', nivel: 5},
  {usuario: 'usr-37', habilidad: 'liderazgo', nivel: 4},
  {usuario: 'usr-37', habilidad: 'comunicacion', nivel: 5},
  {usuario: 'usr-37', habilidad: 'power-bi', nivel: 3},
  {usuario: 'usr-38', habilidad: 'python', nivel: 2},
  {usuario: 'usr-38', habilidad: 'django', nivel: 2},
  {usuario: 'usr-38', habilidad: 'html-css', nivel: 3},
  {usuario: 'usr-38', habilidad: 'sql', nivel: 2},
  {usuario: 'usr-39', habilidad: 'react', nivel: 2},
  {usuario: 'usr-39', habilidad: 'javascript', nivel: 3},
  {usuario: 'usr-39', habilidad: 'python', nivel: 2},
  {usuario: 'usr-39', habilidad: 'django', nivel: 2},
  {usuario: 'usr-40', habilidad: 'nodejs', nivel: 3},
  {usuario: 'usr-40', habilidad: 'sql', nivel: 3},
  {usuario: 'usr-40', habilidad: 'power-bi', nivel: 2},
  {usuario: 'usr-40', habilidad: 'docker', nivel: 2}
] AS fila
MATCH (u:Usuario {id: fila.usuario})
MATCH (h:Habilidad {id: fila.habilidad})
MERGE (u)-[r:TIENE_HABILIDAD]->(h)
SET r.nivel = fila.nivel;

// ---------- Usuario -[:TRABAJA_EN {cargo, desde, actual}]-> Empresa ----------
// actual = false representa un empleo anterior (sirve para rutas y recomendaciones por excompañeros).
UNWIND [
  {usuario: 'usr-01', empresa: 'emp-01', cargo: 'Frontend Developer', desde: '2022-02-01', actual: true},
  {usuario: 'usr-02', empresa: 'emp-01', cargo: 'Tech Lead', desde: '2020-06-15', actual: true},
  {usuario: 'usr-02', empresa: 'emp-02', cargo: 'Desarrollador Full Stack', desde: '2016-03-01', actual: false},
  {usuario: 'usr-03', empresa: 'emp-01', cargo: 'Backend Developer', desde: '2023-01-10', actual: true},
  {usuario: 'usr-04', empresa: 'emp-01', cargo: 'Practicante de Desarrollo', desde: '2025-07-01', actual: true},
  {usuario: 'usr-05', empresa: 'emp-02', cargo: 'Product Owner', desde: '2021-04-05', actual: true},
  {usuario: 'usr-06', empresa: 'emp-02', cargo: 'Desarrollador Java', desde: '2021-09-20', actual: true},
  {usuario: 'usr-07', empresa: 'emp-02', cargo: 'Desarrolladora Móvil', desde: '2023-05-02', actual: true},
  {usuario: 'usr-08', empresa: 'emp-02', cargo: 'DevOps Engineer', desde: '2022-08-16', actual: true},
  {usuario: 'usr-09', empresa: 'emp-01', cargo: 'Diseñadora UX/UI', desde: '2024-03-04', actual: true},
  {usuario: 'usr-11', empresa: 'emp-03', cargo: 'Data Scientist', desde: '2021-01-18', actual: true},
  {usuario: 'usr-12', empresa: 'emp-03', cargo: 'Data Engineer', desde: '2021-07-01', actual: true},
  {usuario: 'usr-12', empresa: 'emp-01', cargo: 'Desarrollador Backend', desde: '2018-02-01', actual: false},
  {usuario: 'usr-13', empresa: 'emp-03', cargo: 'Analista de Datos', desde: '2024-02-12', actual: true},
  {usuario: 'usr-14', empresa: 'emp-04', cargo: 'Backend Developer', desde: '2022-03-07', actual: true},
  {usuario: 'usr-15', empresa: 'emp-04', cargo: 'Engineering Manager', desde: '2019-10-01', actual: true},
  {usuario: 'usr-16', empresa: 'emp-04', cargo: 'ML Engineer', desde: '2023-06-13', actual: true},
  {usuario: 'usr-17', empresa: 'emp-04', cargo: 'Desarrolladora Frontend', desde: '2024-01-15', actual: true},
  {usuario: 'usr-17', empresa: 'emp-06', cargo: 'Practicante Frontend', desde: '2022-07-01', actual: false},
  {usuario: 'usr-18', empresa: 'emp-03', cargo: 'Arquitecto de Datos', desde: '2019-05-20', actual: true},
  {usuario: 'usr-20', empresa: 'emp-04', cargo: 'Backend Developer', desde: '2021-11-02', actual: true},
  {usuario: 'usr-21', empresa: 'emp-05', cargo: 'Cloud Architect', desde: '2020-02-03', actual: true},
  {usuario: 'usr-21', empresa: 'emp-04', cargo: 'Ingeniera de Infraestructura', desde: '2016-08-01', actual: false},
  {usuario: 'usr-22', empresa: 'emp-05', cargo: 'SRE', desde: '2021-05-10', actual: true},
  {usuario: 'usr-23', empresa: 'emp-05', cargo: 'DevOps Engineer', desde: '2023-09-04', actual: true},
  {usuario: 'usr-24', empresa: 'emp-05', cargo: 'Backend Developer', desde: '2022-04-18', actual: true},
  {usuario: 'usr-24', empresa: 'emp-08', cargo: 'Desarrollador Python', desde: '2020-01-13', actual: false},
  {usuario: 'usr-25', empresa: 'emp-06', cargo: 'Diseñadora de Producto', desde: '2020-09-01', actual: true},
  {usuario: 'usr-26', empresa: 'emp-06', cargo: 'Frontend Developer', desde: '2023-03-20', actual: true},
  {usuario: 'usr-27', empresa: 'emp-06', cargo: 'Desarrolladora Móvil', desde: '2022-01-24', actual: true},
  {usuario: 'usr-28', empresa: 'emp-06', cargo: 'Director Creativo', desde: '2018-06-11', actual: true},
  {usuario: 'usr-30', empresa: 'emp-05', cargo: 'Platform Engineer', desde: '2019-11-25', actual: true},
  {usuario: 'usr-31', empresa: 'emp-07', cargo: 'CTO', desde: '2020-07-01', actual: true},
  {usuario: 'usr-31', empresa: 'emp-03', cargo: 'Líder de Ingeniería', desde: '2015-03-02', actual: false},
  {usuario: 'usr-32', empresa: 'emp-07', cargo: 'Backend Developer', desde: '2022-02-14', actual: true},
  {usuario: 'usr-33', empresa: 'emp-07', cargo: 'Analista de Datos', desde: '2023-08-07', actual: true},
  {usuario: 'usr-34', empresa: 'emp-07', cargo: 'Desarrollador Frontend', desde: '2024-05-13', actual: true},
  {usuario: 'usr-35', empresa: 'emp-08', cargo: 'Ingeniera de Software', desde: '2021-10-04', actual: true},
  {usuario: 'usr-36', empresa: 'emp-08', cargo: 'Ingeniero de Datos IoT', desde: '2021-03-15', actual: true},
  {usuario: 'usr-37', empresa: 'emp-08', cargo: 'Product Manager', desde: '2020-11-09', actual: true},
  {usuario: 'usr-38', empresa: 'emp-08', cargo: 'Practicante de Desarrollo', desde: '2025-08-04', actual: true}
] AS fila
MATCH (u:Usuario {id: fila.usuario})
MATCH (e:Empresa {id: fila.empresa})
MERGE (u)-[r:TRABAJA_EN]->(e)
SET r.cargo = fila.cargo, r.desde = date(fila.desde), r.actual = fila.actual;

// ---------- Usuario -[:CONECTA_CON {desde}]- Usuario ----------
// La conexión es mutua: se guarda UNA sola vez y se consulta sin dirección: (a)-[:CONECTA_CON]-(b)
UNWIND [
  {de: 'usr-01', a: 'usr-02', desde: '2023-09-28'},
  {de: 'usr-01', a: 'usr-03', desde: '2022-10-25'},
  {de: 'usr-01', a: 'usr-04', desde: '2022-02-12'},
  {de: 'usr-01', a: 'usr-09', desde: '2020-09-28'},
  {de: 'usr-02', a: 'usr-03', desde: '2021-05-31'},
  {de: 'usr-02', a: 'usr-04', desde: '2022-10-10'},
  {de: 'usr-02', a: 'usr-05', desde: '2020-02-23'},
  {de: 'usr-02', a: 'usr-09', desde: '2020-01-15'},
  {de: 'usr-02', a: 'usr-10', desde: '2023-04-06'},
  {de: 'usr-03', a: 'usr-04', desde: '2020-02-01'},
  {de: 'usr-03', a: 'usr-10', desde: '2023-01-10'},
  {de: 'usr-04', a: 'usr-09', desde: '2022-11-09'},
  {de: 'usr-05', a: 'usr-06', desde: '2025-10-08'},
  {de: 'usr-05', a: 'usr-07', desde: '2021-12-19'},
  {de: 'usr-05', a: 'usr-08', desde: '2019-06-27'},
  {de: 'usr-06', a: 'usr-08', desde: '2024-02-25'},
  {de: 'usr-07', a: 'usr-08', desde: '2025-01-05'},
  {de: 'usr-07', a: 'usr-09', desde: '2020-05-26'},
  {de: 'usr-08', a: 'usr-10', desde: '2023-03-31'},
  {de: 'usr-11', a: 'usr-12', desde: '2019-11-19'},
  {de: 'usr-11', a: 'usr-13', desde: '2025-03-11'},
  {de: 'usr-11', a: 'usr-15', desde: '2022-04-15'},
  {de: 'usr-11', a: 'usr-16', desde: '2026-01-18'},
  {de: 'usr-11', a: 'usr-18', desde: '2025-12-08'},
  {de: 'usr-12', a: 'usr-13', desde: '2023-01-21'},
  {de: 'usr-12', a: 'usr-15', desde: '2025-06-22'},
  {de: 'usr-12', a: 'usr-18', desde: '2021-02-26'},
  {de: 'usr-12', a: 'usr-20', desde: '2019-10-12'},
  {de: 'usr-13', a: 'usr-18', desde: '2019-07-07'},
  {de: 'usr-13', a: 'usr-19', desde: '2026-06-01'},
  {de: 'usr-14', a: 'usr-15', desde: '2021-07-22'},
  {de: 'usr-14', a: 'usr-17', desde: '2022-03-31'},
  {de: 'usr-14', a: 'usr-20', desde: '2019-11-23'},
  {de: 'usr-15', a: 'usr-16', desde: '2021-08-11'},
  {de: 'usr-15', a: 'usr-17', desde: '2020-02-18'},
  {de: 'usr-15', a: 'usr-20', desde: '2023-04-06'},
  {de: 'usr-16', a: 'usr-20', desde: '2022-02-12'},
  {de: 'usr-17', a: 'usr-20', desde: '2024-02-01'},
  {de: 'usr-21', a: 'usr-22', desde: '2026-02-16'},
  {de: 'usr-21', a: 'usr-23', desde: '2023-02-03'},
  {de: 'usr-21', a: 'usr-24', desde: '2020-10-28'},
  {de: 'usr-21', a: 'usr-28', desde: '2023-02-25'},
  {de: 'usr-21', a: 'usr-30', desde: '2022-12-26'},
  {de: 'usr-22', a: 'usr-23', desde: '2021-05-08'},
  {de: 'usr-22', a: 'usr-24', desde: '2026-07-08'},
  {de: 'usr-22', a: 'usr-30', desde: '2021-12-29'},
  {de: 'usr-23', a: 'usr-24', desde: '2026-08-31'},
  {de: 'usr-24', a: 'usr-29', desde: '2026-04-08'},
  {de: 'usr-25', a: 'usr-26', desde: '2019-10-20'},
  {de: 'usr-25', a: 'usr-27', desde: '2025-10-31'},
  {de: 'usr-25', a: 'usr-28', desde: '2026-02-13'},
  {de: 'usr-26', a: 'usr-27', desde: '2020-12-01'},
  {de: 'usr-26', a: 'usr-28', desde: '2024-12-27'},
  {de: 'usr-26', a: 'usr-29', desde: '2021-09-29'},
  {de: 'usr-27', a: 'usr-28', desde: '2020-10-31'},
  {de: 'usr-31', a: 'usr-32', desde: '2024-03-08'},
  {de: 'usr-31', a: 'usr-33', desde: '2023-04-04'},
  {de: 'usr-31', a: 'usr-34', desde: '2022-01-10'},
  {de: 'usr-31', a: 'usr-37', desde: '2026-03-06'},
  {de: 'usr-32', a: 'usr-33', desde: '2026-09-19'},
  {de: 'usr-32', a: 'usr-34', desde: '2025-03-31'},
  {de: 'usr-33', a: 'usr-34', desde: '2021-06-18'},
  {de: 'usr-33', a: 'usr-36', desde: '2026-09-05'},
  {de: 'usr-35', a: 'usr-36', desde: '2022-08-21'},
  {de: 'usr-35', a: 'usr-37', desde: '2019-08-18'},
  {de: 'usr-35', a: 'usr-38', desde: '2021-07-27'},
  {de: 'usr-36', a: 'usr-37', desde: '2019-05-12'},
  {de: 'usr-37', a: 'usr-38', desde: '2022-07-16'},
  {de: 'usr-02', a: 'usr-12', desde: '2023-07-02'},
  {de: 'usr-02', a: 'usr-21', desde: '2022-01-01'},
  {de: 'usr-15', a: 'usr-21', desde: '2019-09-29'},
  {de: 'usr-15', a: 'usr-31', desde: '2021-05-14'},
  {de: 'usr-28', a: 'usr-37', desde: '2025-05-12'},
  {de: 'usr-10', a: 'usr-29', desde: '2022-07-12'},
  {de: 'usr-18', a: 'usr-36', desde: '2021-05-20'}
] AS fila
MATCH (a:Usuario {id: fila.de})
MATCH (b:Usuario {id: fila.a})
MERGE (a)-[r:CONECTA_CON]-(b)
ON CREATE SET r.desde = date(fila.desde);

// ---------- Usuario -[:SOLICITA_CONEXION {fecha}]-> Usuario (pendientes) ----------
// Al aceptarse, la app borra esta relación y crea CONECTA_CON.
UNWIND [
  {de: 'usr-39', a: 'usr-01', fecha: '2026-10-28'},
  {de: 'usr-39', a: 'usr-02', fecha: '2026-10-28'},
  {de: 'usr-40', a: 'usr-12', fecha: '2026-10-30'},
  {de: 'usr-19', a: 'usr-11', fecha: '2026-11-01'},
  {de: 'usr-26', a: 'usr-01', fecha: '2026-11-02'},
  {de: 'usr-33', a: 'usr-11', fecha: '2026-11-03'}
] AS fila
MATCH (a:Usuario {id: fila.de})
MATCH (b:Usuario {id: fila.a})
MERGE (a)-[r:SOLICITA_CONEXION]->(b)
SET r.fecha = date(fila.fecha);

// ---------- Proyectos (y la empresa que los desarrolla) ----------
UNWIND [
  {id: 'prj-01', nombre: 'Rastreo de Contenedores', descripcion: 'Seguimiento en tiempo real de contenedores en el puerto', estado: 'finalizado', empresa: 'emp-02'},
  {id: 'prj-02', nombre: 'Portal de Clientes Caribe', descripcion: 'Portal web de autogestión para clientes', estado: 'en curso', empresa: 'emp-01'},
  {id: 'prj-03', nombre: 'App Móvil de Entregas', descripcion: 'App para conductores con rutas y confirmación de entregas', estado: 'en curso', empresa: 'emp-02'},
  {id: 'prj-04', nombre: 'Scoring Crediticio con ML', descripcion: 'Modelo de riesgo para aprobar microcréditos', estado: 'en curso', empresa: 'emp-04'},
  {id: 'prj-05', nombre: 'Pagos en Tiempo Real', descripcion: 'Motor de pagos inmediatos entre bancos', estado: 'en curso', empresa: 'emp-04'},
  {id: 'prj-06', nombre: 'Lago de Datos Retail', descripcion: 'Centralización de ventas de cadenas de retail', estado: 'finalizado', empresa: 'emp-03'},
  {id: 'prj-07', nombre: 'Grafo Antifraude', descripcion: 'Detección de anillos de fraude con grafos', estado: 'en curso', empresa: 'emp-03'},
  {id: 'prj-08', nombre: 'Plataforma Kubernetes Multinube', descripcion: 'Clústeres administrados sobre AWS y Azure', estado: 'en curso', empresa: 'emp-05'},
  {id: 'prj-09', nombre: 'Rediseño App Bancaria', descripcion: 'Nueva experiencia móvil para un banco regional', estado: 'finalizado', empresa: 'emp-06'},
  {id: 'prj-10', nombre: 'Telemedicina Cali', descripcion: 'Consultas médicas virtuales para clínicas del Valle', estado: 'en curso', empresa: 'emp-07'},
  {id: 'prj-11', nombre: 'Riego Inteligente IoT', descripcion: 'Sensores y modelos para optimizar el riego en el Sinú', estado: 'en curso', empresa: 'emp-08'},
  {id: 'prj-12', nombre: 'Gestor de Inventarios Open Source', descripcion: 'Proyecto comunitario para pymes', estado: 'en curso', empresa: null}
] AS fila
MERGE (p:Proyecto {id: fila.id})
SET p.nombre = fila.nombre, p.descripcion = fila.descripcion, p.estado = fila.estado
WITH p, fila
WHERE fila.empresa IS NOT NULL  // los proyectos comunitarios no tienen empresa
MATCH (e:Empresa {id: fila.empresa})
MERGE (e)-[:DESARROLLA]->(p);

// ---------- Proyecto -[:USA]-> Habilidad (tecnologías del proyecto) ----------
UNWIND [
  {proyecto: 'prj-01', habilidad: 'react'},
  {proyecto: 'prj-01', habilidad: 'nodejs'},
  {proyecto: 'prj-01', habilidad: 'aws'},
  {proyecto: 'prj-01', habilidad: 'mongodb'},
  {proyecto: 'prj-02', habilidad: 'react'},
  {proyecto: 'prj-02', habilidad: 'typescript'},
  {proyecto: 'prj-02', habilidad: 'nodejs'},
  {proyecto: 'prj-02', habilidad: 'sql'},
  {proyecto: 'prj-03', habilidad: 'flutter'},
  {proyecto: 'prj-03', habilidad: 'kotlin'},
  {proyecto: 'prj-03', habilidad: 'nodejs'},
  {proyecto: 'prj-04', habilidad: 'python'},
  {proyecto: 'prj-04', habilidad: 'machine-learning'},
  {proyecto: 'prj-04', habilidad: 'sql'},
  {proyecto: 'prj-04', habilidad: 'aws'},
  {proyecto: 'prj-05', habilidad: 'java'},
  {proyecto: 'prj-05', habilidad: 'spring-boot'},
  {proyecto: 'prj-05', habilidad: 'kubernetes'},
  {proyecto: 'prj-05', habilidad: 'go'},
  {proyecto: 'prj-06', habilidad: 'python'},
  {proyecto: 'prj-06', habilidad: 'sql'},
  {proyecto: 'prj-06', habilidad: 'aws'},
  {proyecto: 'prj-06', habilidad: 'docker'},
  {proyecto: 'prj-07', habilidad: 'neo4j'},
  {proyecto: 'prj-07', habilidad: 'python'},
  {proyecto: 'prj-07', habilidad: 'machine-learning'},
  {proyecto: 'prj-08', habilidad: 'kubernetes'},
  {proyecto: 'prj-08', habilidad: 'terraform'},
  {proyecto: 'prj-08', habilidad: 'aws'},
  {proyecto: 'prj-08', habilidad: 'azure'},
  {proyecto: 'prj-09', habilidad: 'figma'},
  {proyecto: 'prj-09', habilidad: 'ux-research'},
  {proyecto: 'prj-09', habilidad: 'react'},
  {proyecto: 'prj-09', habilidad: 'flutter'},
  {proyecto: 'prj-10', habilidad: 'java'},
  {proyecto: 'prj-10', habilidad: 'spring-boot'},
  {proyecto: 'prj-10', habilidad: 'angular'},
  {proyecto: 'prj-10', habilidad: 'aws'},
  {proyecto: 'prj-11', habilidad: 'python'},
  {proyecto: 'prj-11', habilidad: 'machine-learning'},
  {proyecto: 'prj-11', habilidad: 'aws'},
  {proyecto: 'prj-11', habilidad: 'flutter'},
  {proyecto: 'prj-12', habilidad: 'django'},
  {proyecto: 'prj-12', habilidad: 'python'},
  {proyecto: 'prj-12', habilidad: 'react'},
  {proyecto: 'prj-12', habilidad: 'docker'}
] AS fila
MATCH (p:Proyecto {id: fila.proyecto})
MATCH (h:Habilidad {id: fila.habilidad})
MERGE (p)-[:USA]->(h);

// ---------- Usuario -[:PARTICIPA_EN {rol}]-> Proyecto ----------
UNWIND [
  {usuario: 'usr-05', proyecto: 'prj-01', rol: 'Product Owner'},
  {usuario: 'usr-06', proyecto: 'prj-01', rol: 'Backend'},
  {usuario: 'usr-08', proyecto: 'prj-01', rol: 'DevOps'},
  {usuario: 'usr-02', proyecto: 'prj-01', rol: 'Arquitecto'},
  {usuario: 'usr-01', proyecto: 'prj-02', rol: 'Frontend'},
  {usuario: 'usr-02', proyecto: 'prj-02', rol: 'Tech Lead'},
  {usuario: 'usr-03', proyecto: 'prj-02', rol: 'Backend'},
  {usuario: 'usr-09', proyecto: 'prj-02', rol: 'Diseño UX'},
  {usuario: 'usr-04', proyecto: 'prj-02', rol: 'Frontend'},
  {usuario: 'usr-07', proyecto: 'prj-03', rol: 'Móvil'},
  {usuario: 'usr-05', proyecto: 'prj-03', rol: 'Product Owner'},
  {usuario: 'usr-09', proyecto: 'prj-03', rol: 'Diseño UX'},
  {usuario: 'usr-16', proyecto: 'prj-04', rol: 'ML Engineer'},
  {usuario: 'usr-11', proyecto: 'prj-04', rol: 'Data Scientist'},
  {usuario: 'usr-14', proyecto: 'prj-04', rol: 'Backend'},
  {usuario: 'usr-15', proyecto: 'prj-04', rol: 'Sponsor'},
  {usuario: 'usr-14', proyecto: 'prj-05', rol: 'Backend'},
  {usuario: 'usr-20', proyecto: 'prj-05', rol: 'Backend'},
  {usuario: 'usr-17', proyecto: 'prj-05', rol: 'Frontend'},
  {usuario: 'usr-15', proyecto: 'prj-05', rol: 'Líder'},
  {usuario: 'usr-12', proyecto: 'prj-06', rol: 'Data Engineer'},
  {usuario: 'usr-13', proyecto: 'prj-06', rol: 'Analista'},
  {usuario: 'usr-18', proyecto: 'prj-06', rol: 'Arquitecto'},
  {usuario: 'usr-18', proyecto: 'prj-07', rol: 'Arquitecto'},
  {usuario: 'usr-11', proyecto: 'prj-07', rol: 'Data Scientist'},
  {usuario: 'usr-12', proyecto: 'prj-07', rol: 'Data Engineer'},
  {usuario: 'usr-21', proyecto: 'prj-08', rol: 'Arquitecta'},
  {usuario: 'usr-22', proyecto: 'prj-08', rol: 'SRE'},
  {usuario: 'usr-30', proyecto: 'prj-08', rol: 'Platform'},
  {usuario: 'usr-23', proyecto: 'prj-08', rol: 'DevOps'},
  {usuario: 'usr-25', proyecto: 'prj-09', rol: 'Diseño'},
  {usuario: 'usr-26', proyecto: 'prj-09', rol: 'Frontend'},
  {usuario: 'usr-27', proyecto: 'prj-09', rol: 'Móvil'},
  {usuario: 'usr-28', proyecto: 'prj-09', rol: 'Director'},
  {usuario: 'usr-17', proyecto: 'prj-09', rol: 'Frontend'},
  {usuario: 'usr-31', proyecto: 'prj-10', rol: 'CTO'},
  {usuario: 'usr-32', proyecto: 'prj-10', rol: 'Backend'},
  {usuario: 'usr-34', proyecto: 'prj-10', rol: 'Frontend'},
  {usuario: 'usr-33', proyecto: 'prj-10', rol: 'Analista'},
  {usuario: 'usr-35', proyecto: 'prj-11', rol: 'Desarrolladora'},
  {usuario: 'usr-36', proyecto: 'prj-11', rol: 'Datos IoT'},
  {usuario: 'usr-37', proyecto: 'prj-11', rol: 'Product Manager'},
  {usuario: 'usr-38', proyecto: 'prj-11', rol: 'Junior'},
  {usuario: 'usr-24', proyecto: 'prj-12', rol: 'Mantenedor'},
  {usuario: 'usr-29', proyecto: 'prj-12', rol: 'Frontend'},
  {usuario: 'usr-10', proyecto: 'prj-12', rol: 'Full Stack'},
  {usuario: 'usr-35', proyecto: 'prj-12', rol: 'Backend'}
] AS fila
MATCH (u:Usuario {id: fila.usuario})
MATCH (p:Proyecto {id: fila.proyecto})
MERGE (u)-[r:PARTICIPA_EN]->(p)
SET r.rol = fila.rol;

// ---------- Ofertas (empresa que la publica y ciudad) ----------
UNWIND [
  {id: 'of-01', titulo: 'Desarrollador Frontend React', empresa: 'emp-01', ciudad: 'barranquilla', modalidad: 'híbrido', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-01'},
  {id: 'of-02', titulo: 'Backend Developer Node.js', empresa: 'emp-01', ciudad: 'barranquilla', modalidad: 'remoto', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-05'},
  {id: 'of-03', titulo: 'Ingeniero DevOps', empresa: 'emp-02', ciudad: 'cartagena', modalidad: 'presencial', nivel: 'senior', estado: 'abierta', publicadaEn: '2026-09-20'},
  {id: 'of-04', titulo: 'Científico de Datos', empresa: 'emp-03', ciudad: 'bogota', modalidad: 'híbrido', nivel: 'senior', estado: 'abierta', publicadaEn: '2026-09-28'},
  {id: 'of-05', titulo: 'Analista de Datos Junior', empresa: 'emp-03', ciudad: 'bogota', modalidad: 'remoto', nivel: 'junior', estado: 'abierta', publicadaEn: '2026-10-12'},
  {id: 'of-06', titulo: 'Ingeniero de Grafos Neo4j', empresa: 'emp-03', ciudad: 'bogota', modalidad: 'remoto', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-20'},
  {id: 'of-07', titulo: 'Desarrollador Java Spring', empresa: 'emp-04', ciudad: 'bogota', modalidad: 'híbrido', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-08'},
  {id: 'of-08', titulo: 'Desarrollador Go', empresa: 'emp-04', ciudad: 'bogota', modalidad: 'remoto', nivel: 'senior', estado: 'cerrada', publicadaEn: '2026-08-15'},
  {id: 'of-09', titulo: 'SRE / Platform Engineer', empresa: 'emp-05', ciudad: 'medellin', modalidad: 'híbrido', nivel: 'senior', estado: 'abierta', publicadaEn: '2026-10-15'},
  {id: 'of-10', titulo: 'Desarrollador Python Django', empresa: 'emp-05', ciudad: 'medellin', modalidad: 'remoto', nivel: 'junior', estado: 'abierta', publicadaEn: '2026-10-22'},
  {id: 'of-11', titulo: 'Diseñador UX/UI', empresa: 'emp-06', ciudad: 'medellin', modalidad: 'presencial', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-03'},
  {id: 'of-12', titulo: 'Desarrollador Flutter', empresa: 'emp-06', ciudad: 'medellin', modalidad: 'remoto', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-18'},
  {id: 'of-13', titulo: 'Desarrollador Frontend Angular', empresa: 'emp-07', ciudad: 'cali', modalidad: 'híbrido', nivel: 'junior', estado: 'abierta', publicadaEn: '2026-10-25'},
  {id: 'of-14', titulo: 'Ingeniero de Datos IoT', empresa: 'emp-08', ciudad: 'monteria', modalidad: 'presencial', nivel: 'semi-senior', estado: 'abierta', publicadaEn: '2026-10-10'},
  {id: 'of-15', titulo: 'Practicante de Desarrollo Web', empresa: 'emp-01', ciudad: 'barranquilla', modalidad: 'presencial', nivel: 'junior', estado: 'abierta', publicadaEn: '2026-10-29'}
] AS fila
MERGE (o:Oferta {id: fila.id})
SET o.titulo = fila.titulo, o.modalidad = fila.modalidad, o.nivel = fila.nivel,
    o.estado = fila.estado, o.publicadaEn = date(fila.publicadaEn)
WITH o, fila
MATCH (e:Empresa {id: fila.empresa})
MATCH (c:Ciudad {id: fila.ciudad})
MERGE (e)-[:PUBLICA]->(o)
MERGE (o)-[:UBICADA_EN]->(c);

// ---------- Oferta -[:REQUIERE {nivelMinimo, obligatoria}]-> Habilidad ----------
UNWIND [
  {oferta: 'of-01', habilidad: 'react', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-01', habilidad: 'typescript', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-01', habilidad: 'html-css', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-01', habilidad: 'figma', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-02', habilidad: 'nodejs', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-02', habilidad: 'sql', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-02', habilidad: 'docker', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-02', habilidad: 'aws', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-03', habilidad: 'aws', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-03', habilidad: 'terraform', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-03', habilidad: 'kubernetes', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-03', habilidad: 'docker', nivelMinimo: 4, obligatoria: false},
  {oferta: 'of-04', habilidad: 'python', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-04', habilidad: 'machine-learning', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-04', habilidad: 'sql', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-04', habilidad: 'pandas', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-05', habilidad: 'sql', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-05', habilidad: 'power-bi', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-05', habilidad: 'python', nivelMinimo: 1, obligatoria: false},
  {oferta: 'of-06', habilidad: 'neo4j', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-06', habilidad: 'python', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-06', habilidad: 'sql', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-07', habilidad: 'java', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-07', habilidad: 'spring-boot', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-07', habilidad: 'sql', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-07', habilidad: 'kubernetes', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-08', habilidad: 'go', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-08', habilidad: 'kubernetes', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-08', habilidad: 'docker', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-09', habilidad: 'kubernetes', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-09', habilidad: 'terraform', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-09', habilidad: 'aws', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-09', habilidad: 'go', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-10', habilidad: 'python', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-10', habilidad: 'django', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-10', habilidad: 'sql', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-10', habilidad: 'docker', nivelMinimo: 1, obligatoria: false},
  {oferta: 'of-11', habilidad: 'figma', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-11', habilidad: 'ux-research', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-11', habilidad: 'html-css', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-12', habilidad: 'flutter', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-12', habilidad: 'kotlin', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-12', habilidad: 'figma', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-13', habilidad: 'angular', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-13', habilidad: 'typescript', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-13', habilidad: 'html-css', nivelMinimo: 3, obligatoria: false},
  {oferta: 'of-14', habilidad: 'python', nivelMinimo: 4, obligatoria: true},
  {oferta: 'of-14', habilidad: 'aws', nivelMinimo: 3, obligatoria: true},
  {oferta: 'of-14', habilidad: 'docker', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-14', habilidad: 'machine-learning', nivelMinimo: 2, obligatoria: false},
  {oferta: 'of-15', habilidad: 'javascript', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-15', habilidad: 'html-css', nivelMinimo: 2, obligatoria: true},
  {oferta: 'of-15', habilidad: 'react', nivelMinimo: 1, obligatoria: false}
] AS fila
MATCH (o:Oferta {id: fila.oferta})
MATCH (h:Habilidad {id: fila.habilidad})
MERGE (o)-[r:REQUIERE]->(h)
SET r.nivelMinimo = fila.nivelMinimo, r.obligatoria = fila.obligatoria;

// ---------- Usuario -[:POSTULA_A {fecha, estado}]-> Oferta ----------
UNWIND [
  {usuario: 'usr-03', oferta: 'of-02', fecha: '2026-10-07', estado: 'en revisión'},
  {usuario: 'usr-04', oferta: 'of-15', fecha: '2026-10-30', estado: 'entrevista'},
  {usuario: 'usr-04', oferta: 'of-01', fecha: '2026-10-03', estado: 'rechazada'},
  {usuario: 'usr-06', oferta: 'of-07', fecha: '2026-10-10', estado: 'en revisión'},
  {usuario: 'usr-10', oferta: 'of-02', fecha: '2026-10-09', estado: 'en revisión'},
  {usuario: 'usr-13', oferta: 'of-04', fecha: '2026-10-02', estado: 'enviada'},
  {usuario: 'usr-16', oferta: 'of-04', fecha: '2026-09-30', estado: 'entrevista'},
  {usuario: 'usr-19', oferta: 'of-05', fecha: '2026-10-14', estado: 'en revisión'},
  {usuario: 'usr-23', oferta: 'of-09', fecha: '2026-10-17', estado: 'enviada'},
  {usuario: 'usr-26', oferta: 'of-01', fecha: '2026-10-06', estado: 'entrevista'},
  {usuario: 'usr-29', oferta: 'of-02', fecha: '2026-10-11', estado: 'enviada'},
  {usuario: 'usr-33', oferta: 'of-05', fecha: '2026-10-16', estado: 'enviada'},
  {usuario: 'usr-38', oferta: 'of-10', fecha: '2026-10-24', estado: 'enviada'},
  {usuario: 'usr-39', oferta: 'of-15', fecha: '2026-11-01', estado: 'enviada'},
  {usuario: 'usr-40', oferta: 'of-02', fecha: '2026-11-02', estado: 'enviada'}
] AS fila
MATCH (u:Usuario {id: fila.usuario})
MATCH (o:Oferta {id: fila.oferta})
MERGE (u)-[r:POSTULA_A]->(o)
SET r.fecha = date(fila.fecha), r.estado = fila.estado;

// ---------- Verificación rápida ----------
// Debe devolver: Usuario 40, Empresa 8, Habilidad 29, Proyecto 12, Oferta 15, Ciudad 6
MATCH (n)
RETURN labels(n)[0] AS etiqueta, count(*) AS total
ORDER BY etiqueta;
