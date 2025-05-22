const fs = require('fs')

// Template
const templates = []

// Generate tables based on template
function generateColumnCode(columnName, properties) {
    let code = "table"
    const type = properties.find(p => ["string", "date", "integer", "boolean", "text", "increments"].includes(p))
  
    if (type === "string") code += `.string('${columnName}', 80)`
    else if (type === "increments") code += `.increments('${columnName}')`
    else if (type === "integer") code += `.integer('${columnName}')`
    else if (type === "boolean") code += `.boolean('${columnName}')`
    else if (type === "text") code += `.text('${columnName}')`
    else if (type === "date") code += `.date('${columnName}')`
  
    if (properties.some(p => p.startsWith("foreign"))) code += `.unsigned()`
  
    properties.forEach(prop => {
      if (prop === "primary" && type !== "increments") code += `.primary()`
      if (prop === "notNullable") code += `.notNullable()`
    })
  
    return code
  }
  
function gerarCodigoKnex(template) {
  const nomeTabela = template["Tabela"]
  const colunas = Object.entries(template).filter(([key]) => key !== "Tabela")

  const linhasColunas = colunas.map(([nome, props]) =>
    "            " + generateColumnCode(nome, props)
  ).join("\n")

  // FOREIGN KEYS
  const foreignConstraints = colunas
    .filter(([_, props]) => props.some(p => p.startsWith("foreign")))
    .map(([nome, props]) => {
      const tabelaReferenciada = nome.replace(/ID$/i, '').toLowerCase() + 's'
      return `            table.foreign('${nome}').references('${tabelaReferenciada}.id')`
  }).join("\n")

  const nomeFuncao = `create${nomeTabela[0].toUpperCase() + nomeTabela.slice(1)}Table`

  return `const ${nomeFuncao} = async () => {
    const exists = await knex.schema.hasTable('${nomeTabela}')
    if (!exists) {
        await knex.schema.createTable('${nomeTabela}', (table) => {
        ${linhasColunas}
        ${foreignConstraints ? "\n" + foreignConstraints : ""}
        })
    } else {
        console.log('${nomeTabela} já existe')
    }
}
${nomeFuncao}()`
}

// Generate endpoints based on template
function gerarEndpointsFastify(template) {
  const nomeTabela = template["Tabela"]
  const colunas = Object.entries(template).filter(([key]) => key !== "Tabela")
  const camposTodos = colunas.filter(([nome]) => nome !== "id").map(([nome]) => nome)
  const camposShow = colunas.filter(([_, props]) => props.includes("show")).map(([nome]) => nome)

  // FOREIGN KEYS
  const foreignKeys = colunas
    .filter(([_, props]) => props.some(p => p.startsWith("foreign.")))
    .map(([nome, props]) => {
    const foreignAttr = props.find(p => p.startsWith("foreign."))
    const partes = foreignAttr.split('.')
    const atributos = partes.slice(1) // consider everything after "foreign."
    const tabelaRef = nome.replace(/ID$/i, '').toLowerCase() + 's'
    return { nome, tabelaRef, atributos }
  })


  const joinSnippets = foreignKeys.map(fk =>
    `    .join('${fk.tabelaRef}', function () {\n` +
    `      this.on('${fk.tabelaRef}.id', '=', '${nomeTabela}.${fk.nome}')\n` +
    `    })`
  ).join('\n')

  const camposSelecionados = [
    `'${nomeTabela}.id'`,
    ...camposShow.map(c => `'${nomeTabela}.${c}'`),
    ...foreignKeys.flatMap(fk => {
      const campos = [`'${fk.tabelaRef}.id as ${fk.tabelaRef}_id'`]
      campos.push(...fk.atributos.map(attr =>
        `'${fk.tabelaRef}.${attr} as ${fk.tabelaRef}_${attr}'`
      ))
      return campos
    })
  ].join(', ')
  

  const filtrosShow = camposShow.map(campo =>
    `    if (${campo}) query = query.where('${nomeTabela}.${campo}', 'like', \`%\${${campo}}%\`)`
  ).join('\n')

  return `
  // Rotas para ${nomeTabela}
  server.post('/${nomeTabela}', async (req, res) => {
    const { ${camposTodos.join(', ')} } = req.body
    const [id] = await knex('${nomeTabela}').insert({ ${camposTodos.join(', ')} })
    return { message: '${nomeTabela} adicionado com sucesso', id, ${camposTodos.join(', ')} }
  })

  server.put('/${nomeTabela}/:id', async (req, res) => {
    const { id } = req.params
    const { ${camposTodos.join(', ')} } = req.body
    await knex('${nomeTabela}').where({ id }).update({ ${camposTodos.join(', ')} })
    return { message: '${nomeTabela} atualizado com sucesso' }
  })

  server.delete('/${nomeTabela}/:id', async (req, res) => {
    const { id } = req.params
    await knex('${nomeTabela}').where({ id }).del()
    return { message: '${nomeTabela} removido com sucesso' }
  })

  server.get('/${nomeTabela}', async (req, res) => {
    const { ${camposShow.join(', ')} } = req.query
    let query = knex('${nomeTabela}')
  ${joinSnippets ? joinSnippets : ''}
      .select(${camposSelecionados})

  ${filtrosShow}

    const resultados = await query
    return resultados
  })`
}

// Generate the complete project
function gerarProjetoCompleto(templates, dbConfig = { user: 'root', password: '', database: '' }) {
  const { user, password, database } = dbConfig;

  const codigoTabelas = templates.map(t => gerarCodigoKnex(t)).join("\n\n")
  const codigoEndpoints = templates.map(t => gerarEndpointsFastify(t)).join("\n\n")

  return `const fastify = require('fastify')
const knex = require('knex')({
    client: 'mysql',
    connection: {
        host: '127.0.0.1',
        port: 3306,
        user: '${user}',
        password: '${password}',
        database: '${database}'
    }
})
const server = fastify()

server.get('/', async (req, res) => {
    return { message: 'Rotas disponíveis: ${templates.map(t => '/' + t.Tabela.toLowerCase()).join(', ')}' }
})

${codigoTabelas}

${codigoEndpoints}

server.listen({ port: 3000 }, (err, address) => {
    console.log(\`Rodando em \${address}\`)
})`
}

// Create final file
const codigoFinal = gerarProjetoCompleto(templates)
fs.writeFileSync('appGerated.js', codigoFinal)
console.log('gerado appGerated.js')
