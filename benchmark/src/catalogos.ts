// Mismas ciudades y habilidades que la semilla de la demo (db/02_datos_semilla.cypher).

export const CIUDADES = [
  { id: 'barranquilla', nombre: 'Barranquilla', departamento: 'Atlántico', peso: 15 },
  { id: 'bogota', nombre: 'Bogotá', departamento: 'Bogotá D.C.', peso: 30 },
  { id: 'medellin', nombre: 'Medellín', departamento: 'Antioquia', peso: 20 },
  { id: 'cali', nombre: 'Cali', departamento: 'Valle del Cauca', peso: 15 },
  { id: 'cartagena', nombre: 'Cartagena', departamento: 'Bolívar', peso: 10 },
  { id: 'monteria', nombre: 'Montería', departamento: 'Córdoba', peso: 10 },
] as const;

export const HABILIDADES = [
  { id: 'react', nombre: 'React', categoria: 'Frontend' },
  { id: 'typescript', nombre: 'TypeScript', categoria: 'Frontend' },
  { id: 'javascript', nombre: 'JavaScript', categoria: 'Frontend' },
  { id: 'angular', nombre: 'Angular', categoria: 'Frontend' },
  { id: 'html-css', nombre: 'HTML/CSS', categoria: 'Frontend' },
  { id: 'nodejs', nombre: 'Node.js', categoria: 'Backend' },
  { id: 'python', nombre: 'Python', categoria: 'Backend' },
  { id: 'java', nombre: 'Java', categoria: 'Backend' },
  { id: 'spring-boot', nombre: 'Spring Boot', categoria: 'Backend' },
  { id: 'django', nombre: 'Django', categoria: 'Backend' },
  { id: 'go', nombre: 'Go', categoria: 'Backend' },
  { id: 'sql', nombre: 'SQL', categoria: 'Datos' },
  { id: 'neo4j', nombre: 'Neo4j', categoria: 'Datos' },
  { id: 'mongodb', nombre: 'MongoDB', categoria: 'Datos' },
  { id: 'power-bi', nombre: 'Power BI', categoria: 'Datos' },
  { id: 'machine-learning', nombre: 'Machine Learning', categoria: 'Datos' },
  { id: 'pandas', nombre: 'Pandas', categoria: 'Datos' },
  { id: 'aws', nombre: 'AWS', categoria: 'Cloud' },
  { id: 'azure', nombre: 'Azure', categoria: 'Cloud' },
  { id: 'docker', nombre: 'Docker', categoria: 'Cloud' },
  { id: 'kubernetes', nombre: 'Kubernetes', categoria: 'Cloud' },
  { id: 'terraform', nombre: 'Terraform', categoria: 'Cloud' },
  { id: 'flutter', nombre: 'Flutter', categoria: 'Móvil' },
  { id: 'kotlin', nombre: 'Kotlin', categoria: 'Móvil' },
  { id: 'figma', nombre: 'Figma', categoria: 'Diseño' },
  { id: 'ux-research', nombre: 'UX Research', categoria: 'Diseño' },
  { id: 'liderazgo', nombre: 'Liderazgo', categoria: 'Blandas' },
  { id: 'scrum', nombre: 'Scrum', categoria: 'Blandas' },
  { id: 'comunicacion', nombre: 'Comunicación', categoria: 'Blandas' },
] as const;

/**
 * Un rol da coherencia a cada perfil: habilidades que van juntas, un titular y un cargo.
 * Sin roles, las habilidades saldrían al azar y las recomendaciones no tendrían patrón.
 */
export const ROLES = [
  { id: 'frontend', peso: 20, titular: 'Frontend Developer', habilidades: ['react', 'typescript', 'javascript', 'angular', 'html-css', 'figma'] },
  { id: 'backend', peso: 22, titular: 'Backend Developer', habilidades: ['nodejs', 'python', 'java', 'spring-boot', 'django', 'go', 'sql', 'docker'] },
  { id: 'datos', peso: 18, titular: 'Data Engineer', habilidades: ['python', 'sql', 'neo4j', 'mongodb', 'power-bi', 'machine-learning', 'pandas'] },
  { id: 'cloud', peso: 12, titular: 'Cloud Engineer', habilidades: ['aws', 'azure', 'docker', 'kubernetes', 'terraform', 'go', 'python'] },
  { id: 'movil', peso: 8, titular: 'Mobile Developer', habilidades: ['flutter', 'kotlin', 'java', 'typescript', 'figma'] },
  { id: 'diseno', peso: 8, titular: 'Diseñador UX/UI', habilidades: ['figma', 'ux-research', 'html-css', 'comunicacion'] },
  { id: 'gestion', peso: 12, titular: 'Product Manager', habilidades: ['scrum', 'liderazgo', 'comunicacion', 'power-bi', 'ux-research'] },
] as const;

export const BLANDAS = ['liderazgo', 'scrum', 'comunicacion'] as const;

export const NOMBRES = [
  'Ana', 'Andrés', 'Camila', 'Carlos', 'Daniela', 'Diego', 'Valentina', 'Santiago', 'Laura', 'Felipe',
  'Mariana', 'Juan', 'Paula', 'Sebastián', 'Natalia', 'Mateo', 'Isabella', 'Nicolás', 'Sofía', 'Alejandro',
  'Juliana', 'Esteban', 'Carolina', 'Tomás', 'Gabriela', 'Ricardo', 'Manuela', 'Kevin', 'Luisa', 'Jorge',
];

export const APELLIDOS = [
  'Pérez', 'Gómez', 'Rodríguez', 'Martínez', 'López', 'García', 'Ramírez', 'Torres', 'Vargas', 'Moreno',
  'Herrera', 'Castro', 'Rojas', 'Ospina', 'Restrepo', 'Muñoz', 'Mejía', 'Quintero', 'Barrios', 'Petro',
  'Doria', 'Espitia', 'Henao', 'Correa', 'Valencia', 'Zapata', 'Arango', 'Suárez', 'Lozano', 'Cárdenas',
];

export const PALABRAS_EMPRESA = [
  ['Caribe', 'Andes', 'Pacífico', 'Sinú', 'Magdalena', 'Cóndor', 'Café', 'Orquídea', 'Llanos', 'Tayrona'],
  ['Software', 'Data', 'Labs', 'Cloud', 'Digital', 'Tech', 'Sistemas', 'Analytics', 'Studio', 'Logística'],
];

export const SECTORES = ['Software', 'Fintech', 'Salud', 'Logística', 'Retail', 'Agrotech', 'Educación', 'Energía'];

export const NIVELES_OFERTA = [
  { valor: 'junior', peso: 35 },
  { valor: 'semi-senior', peso: 40 },
  { valor: 'senior', peso: 25 },
] as const;

export const MODALIDADES = [
  { valor: 'presencial', peso: 30 },
  { valor: 'híbrido', peso: 40 },
  { valor: 'remoto', peso: 30 },
] as const;

export const ESTADOS_POSTULACION = ['enviada', 'en revisión', 'entrevista', 'rechazada', 'aceptada'] as const;
