require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SelectMenuBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ]
});

const actions = {};
const tempActions = new Map();

client.on('ready', () => {
    console.log('Bot está funcionando autenticado e pronto para uso!');
});

// Comando para iniciar o painel
client.on('messageCreate', async (message) => {
    if(message.channel.name !== 'iniciar-ação' || message.author.bot) return;
    if(message.content !== '!iniciar') return;

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('criar_acao')
                .setLabel('📝 Criar Nova Ação')
                .setStyle(ButtonStyle.Primary)
        );

    await message.channel.send({
        content: '### 🎮 Painel de Criação de Ações\nClique no botão abaixo para criar uma nova ação!',
        components: [button]
    });
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId === 'criar_acao') {
        const modal = new ModalBuilder()
            .setCustomId('modal_acao')
            .setTitle('Criar Nova Ação');

        const nomeInput = new TextInputBuilder()
            .setCustomId('nome_acao')
            .setLabel('Nome da Ação')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite o nome da ação')
            .setRequired(true);

        const vagasInput = new TextInputBuilder()
            .setCustomId('vagas_acao')
            .setLabel('Número de Vagas')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite o número de vagas')
            .setRequired(true);

        // Primeiro mostramos apenas o modal básico
        modal.addComponents(
            new ActionRowBuilder().addComponents(nomeInput),
            new ActionRowBuilder().addComponents(vagasInput)
        );

        await interaction.showModal(modal);
    }
});

// Tratando a submissão do modal inicial
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'modal_acao') {
        const actionName = interaction.fields.getTextInputValue('nome_acao');
        const vagas = parseInt(interaction.fields.getTextInputValue('vagas_acao'));

        if(isNaN(vagas)) {
            return interaction.reply({ content: 'Número de vagas inválido!', ephemeral: true });
        }

        // Usando Map para armazenar dados temporários
        tempActions.set(interaction.user.id, {
            name: actionName,
            vagas: vagas
        });

        const armaSelect = new ActionRowBuilder()
            .addComponents(
                new SelectMenuBuilder()
                    .setCustomId('arma_select')  // Simplificando o customId
                    .setPlaceholder('Foi pega arma do baú?')
                    .addOptions([
                        { label: 'Sim', value: 'sim', description: 'Armas do baú foram pegas' },
                        { label: 'Não', value: 'nao', description: 'Nenhuma arma do baú foi pega' }
                    ])
            );

        await interaction.reply({
            content: 'Foi pega arma do baú?',
            components: [armaSelect],
            ephemeral: true
        });
    }
});

// Tratando a seleção de armas
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isSelectMenu()) return;
    
    if (interaction.customId === 'arma_select') {
        const tempData = tempActions.get(interaction.user.id);
        if (!tempData) {
            return interaction.reply({ 
                content: 'Erro: Sessão expirada. Por favor, crie a ação novamente.', 
                ephemeral: true 
            });
        }

        const pegouArma = interaction.values[0] === 'sim';

        if (pegouArma) {
            const quantidadeModal = new ModalBuilder()
                .setCustomId('quantidade_armas_modal')
                .setTitle('Quantidade de Armas');

            const quantidadeInput = new TextInputBuilder()
                .setCustomId('quantidade_armas')
                .setLabel('Quantas armas foram pegas do baú?')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Digite o número de armas')
                .setRequired(true);

            quantidadeModal.addComponents(
                new ActionRowBuilder().addComponents(quantidadeInput)
            );

            tempData.pegouArma = true;
            await interaction.showModal(quantidadeModal);
        } else {
            // Criar ação sem armas
            const actionId = Date.now();
            actions[actionId] = {
                name: tempData.name,
                vagas: tempData.vagas,
                pegouArma: false,
                quantidadeArmas: 0,
                participantes: [],
                reservas: []
            };

            tempActions.delete(interaction.user.id); // Limpa dados temporários

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`Participar_${actionId}`)
                        .setLabel('✅ Participar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`Cancelar_${actionId}`)
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.update({ components: [], content: 'Ação criada com sucesso!', ephemeral: true });
            await interaction.channel.send({
                embeds: [{
                    color: 0x0099FF,
                    title: `🎮 ${tempData.name}`,
                    description: `
📅 **Data:** <t:${Math.floor(actionId / 1000)}:F>

👥 **Vagas:** 0/${tempData.vagas}
🗡️ **Arma do baú:** Não

**Participantes:**
*Nenhum participante ainda*`,
                    footer: {
                        text: 'Use os botões abaixo para participar ou se retirar da ação!'
                    }
                }],
                components: [buttons]
            });
        }
    }
});

// Tratando a quantidade de armas
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'quantidade_armas_modal') {
        const tempData = tempActions.get(interaction.user.id);
        if (!tempData) {
            return interaction.reply({ 
                content: 'Erro: Sessão expirada. Por favor, crie a ação novamente.', 
                ephemeral: true 
            });
        }

        const quantidade = parseInt(interaction.fields.getTextInputValue('quantidade_armas'));
        if(isNaN(quantidade)) {
            return interaction.reply({ content: 'Quantidade inválida!', ephemeral: true });
        }

        const actionId = Date.now();
        actions[actionId] = {
            name: tempData.name,
            vagas: tempData.vagas,
            pegouArma: true,
            quantidadeArmas: quantidade,
            participantes: [],
            reservas: []
        };

        tempActions.delete(interaction.user.id); // Limpa dados temporários

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`Participar_${actionId}`)
                    .setLabel('✅ Participar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`Cancelar_${actionId}`)
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ content: 'Ação criada com sucesso!', ephemeral: true });
        await interaction.channel.send({
            embeds: [{
                color: 0x0099FF,
                title: `🎮 ${tempData.name}`,
                description: `
📅 **Data:** <t:${Math.floor(actionId / 1000)}:F>

👥 **Vagas:** 0/${tempData.vagas}
🗡️ **Arma do baú:** Sim (${quantidade} armas)

**Participantes:**
*Nenhum participante ainda*`,
                footer: {
                    text: 'Use os botões abaixo para participar ou se retirar da ação!'
                }
            }],
            components: [buttons]
        });
    }
});

// Mantendo o resto do código de participação e cancelamento igual
client.on('interactionCreate', async (interaction) => {
    if(!interaction.isButton()) return;

    const [action, actionId] = interaction.customId.split('_');
    const actionData = actions[actionId];

    if(!actionData) return interaction.reply({ content: 'Ação não encontrada.', ephemeral: true });

    if(action === 'Participar'){
        if(actionData.participantes.includes(interaction.user.id)){
            actionData.participantes = actionData.participantes.filter(id => id !== interaction.user.id);
            actionData.reservas = actionData.reservas.filter(id => id !== interaction.user.id);
            await interaction.reply({content: 'Você foi removido da lista de participantes.', ephemeral: true});
        }else if(actionData.participantes.length < actionData.vagas){
            actionData.participantes.push(interaction.user.id);
            await interaction.reply({content: 'Você foi adicionado a lista de participantes.', ephemeral: true});
        }else {
            actionData.reservas.push(interaction.user.id);
            await interaction.reply({content: 'Você foi adicionado a lista de reservas.', ephemeral: true});
        }

        // Formatando a lista de participantes com números
        const participantesList = actionData.participantes.length > 0 
            ? actionData.participantes.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
            : '*Nenhum participante ainda*';

        // Formatando a lista de reservas com números
        const reservasList = actionData.reservas.length > 0
            ? actionData.reservas.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
            : '*Nenhuma reserva ainda*';

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`Participar_${actionId}`)
                    .setLabel(actionData.participantes.includes(interaction.user.id) ? '❌ Se Retirar' : '✅ Participar')
                    .setStyle(actionData.participantes.includes(interaction.user.id) ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`Cancelar_${actionId}`)
                    .setLabel('❌ Cancelar')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.message.edit({
            embeds: [{
                color: 0x0099FF,
                title: `🎮 ${actionData.name}`,
                description: `
📅 **Data:** <t:${Math.floor(actionId / 1000)}:F>

👥 **Vagas:** ${actionData.participantes.length}/${actionData.vagas}
🗡️ **Arma do baú:** ${actionData.pegouArma ? 'Sim' : 'Não'}

**Participantes:**
${participantesList}

${actionData.reservas.length > 0 ? `**Reservas:**\n${reservasList}` : ''}`,
                footer: {
                    text: 'Use os botões abaixo para participar ou se retirar da ação!'
                }
            }],
            components: [buttons]
        });
    }

    if(action === 'Cancelar'){
        const select = new ActionRowBuilder()
            .addComponents(
                new SelectMenuBuilder()
                    .setCustomId(`status_${actionId}`)
                    .setPlaceholder('Selecione o status da ação')
                    .addOptions([
                        { label: '🏆 Vitória', value: 'vitoria' },
                        { label: '💀 Derrota', value: 'derrota' }
                    ])
            );

        await interaction.reply({ content: '⚔️ Qual foi o status da ação?', components: [select], ephemeral: true });
    }
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isSelectMenu()) return;

    const [_, actionId] = interaction.customId.split('_');
    const actionData = actions[actionId];

    if(!actionData) return interaction.reply({ content: 'Ação não encontrada.', ephemeral: true });

    const status = interaction.values[0];
    const participantes = actionData.participantes.map(id => `<@${id}>`).join('\n') || 'Nenhum participante';

    await interaction.channel.send({
        embeds: [{
            color: status === 'vitoria' ? 0x00FF00 : 0xFF0000,
            title: '🎮 Resultado da Ação',
            fields: [
                { name: '🎭 Ação', value: actionData.name, inline: true },
                { name: '📅 Data', value: `<t:${Math.floor(actionId / 1000)}:F>`, inline: true },
                { name: '⚔️ Status', value: status === 'vitoria' ? '🏆 Vitória' : '💀 Derrota', inline: true },
                { name: '👥 Participantes', value: participantes }
            ]
        }]
    });

    delete actions[actionId];
    await interaction.reply({ content: 'Ação finalizada com sucesso!', ephemeral: true });
});

client.login(process.env.TOKEN);