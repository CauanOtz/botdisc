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

let actions = {};

client.on('ready', () => {
    console.log('Bot está funcionando autenticado e pronto para uso!');
});

// Comando para configurar a mensagem fixa
client.on('messageCreate', async (message) => {
    if(message.channel.name !== '💣⠂𝖠𝖼̧𝖺̃𝗈' || message.author.bot) return;
    if(message.content !== '!configurar') return;

    // Deleta a mensagem do comando
    await message.delete();

    const button = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('criar_acao')
                .setLabel('📝 Criar Nova Ação')
                .setStyle(ButtonStyle.Primary)
        );

    // Envia a mensagem fixa
    const fixedMessage = await message.channel.send({
        embeds: [{
            color: 0x0099FF,
            title: '🎮 Sistema de Ações',
            description: 'Use o botão abaixo para criar uma nova ação!\n\n' +
                        '**Como funciona:**\n' +
                        '• Clique no botão para criar uma ação\n' +
                        '• Preencha as informações necessárias\n' +
                        '• Gerencie os participantes usando os botões\n' +
                        '• Finalize ou cancele a ação quando necessário',
            footer: {
                text: 'Sistema de Ações - Clique no botão abaixo para começar!'
            }
        }],
        components: [button]
    });

    // Opcional: Fixa a mensagem no canal
    try {
        await fixedMessage.pin();
    } catch (error) {
        console.error('Não foi possível fixar a mensagem:', error);
    }
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

        const armaInput = new TextInputBuilder()
            .setCustomId('arma_acao')
            .setLabel('Quantidade de armas pegas do baú')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite a quantidade (0 se não pegou)')
            .setRequired(false);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nomeInput),
            new ActionRowBuilder().addComponents(vagasInput),
            new ActionRowBuilder().addComponents(armaInput)
        );

        await interaction.showModal(modal);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'modal_acao') {
        const actionName = interaction.fields.getTextInputValue('nome_acao');
        const vagas = parseInt(interaction.fields.getTextInputValue('vagas_acao'));
        const quantidadeArmas = interaction.fields.getTextInputValue('arma_acao');
        
        if(isNaN(vagas)) {
            return interaction.reply({ 
                content: 'Número de vagas inválido!', 
                flags: 1 << 6 
            });
        }

        const armas = quantidadeArmas ? parseInt(quantidadeArmas) : 0;
        if(isNaN(armas)) {
            return interaction.reply({ 
                content: 'Quantidade de armas inválida!', 
                flags: 1 << 6 
            });
        }

        const actionId = Date.now();
        actions[actionId] = {
            name: actionName,
            vagas: vagas,
            pegouArma: armas > 0,
            quantidadeArmas: armas,
            participantes: [],
            reservas: [],
            criador: interaction.user.id
        };

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`Participar_${actionId}`)
                    .setLabel('✅ Participar')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(actions[actionId].participantes.includes(interaction.user.id) || actions[actionId].reservas.includes(interaction.user.id)),
                new ButtonBuilder()
                    .setCustomId(`Retirar_${actionId}`)
                    .setLabel('❌ Se Retirar')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!actions[actionId].participantes.includes(interaction.user.id) && !actions[actionId].reservas.includes(interaction.user.id)),
                new ButtonBuilder()
                    .setCustomId(`Finalizar_${actionId}`)
                    .setLabel('🏆 Finalizar')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`Cancelar_${actionId}`)
                    .setLabel('🚫 Cancelar Ação')
                    .setStyle(ButtonStyle.Danger)
            );

        await interaction.reply({ 
            content: 'Ação criada com sucesso!', 
            flags: 1 << 6 
        });

        await interaction.channel.send({
            embeds: [{
                color: 0x0099FF,
                title: `🎮 ${actionName}`,
                description: `
📅 **Data:** <t:${Math.floor(actionId / 1000)}:F>

👥 **Vagas:** 0/${vagas}
🗡️ **Arma do baú:** ${armas > 0 ? `Sim (${armas} armas)` : 'Não'}

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

    if(!actionData) return interaction.reply({ 
        content: 'Ação não encontrada.', 
        flags: 1 << 6
    });

    if(action === 'Participar' || action === 'Retirar'){
        const isParticipante = actionData.participantes.includes(interaction.user.id);
        const isReserva = actionData.reservas.includes(interaction.user.id);
        const isUserInAction = isParticipante || isReserva;

        if(action === 'Retirar' || isUserInAction){
            // Remove o usuário da lista em que ele está
            actionData.participantes = actionData.participantes.filter(id => id !== interaction.user.id);
            actionData.reservas = actionData.reservas.filter(id => id !== interaction.user.id);

            // Se um participante saiu e há reservas, promove o primeiro reserva
            if(isParticipante && actionData.reservas.length > 0) {
                const proximoParticipante = actionData.reservas.shift();
                actionData.participantes.push(proximoParticipante);
            }
        }else if(actionData.participantes.length < actionData.vagas){
            actionData.participantes.push(interaction.user.id);
        }else {
            actionData.reservas.push(interaction.user.id);
        }

        // Formatando a lista de participantes com números
        const participantesList = actionData.participantes.length > 0 
            ? actionData.participantes.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
            : '*Nenhum participante ainda*';

        // Formatando a lista de reservas com números
        const reservasList = actionData.reservas.length > 0
            ? actionData.reservas.map((id, index) => `${index + 1}. <@${id}>`).join('\n')
            : '*Nenhuma reserva ainda*';

        // Atualiza a mensagem principal
        await interaction.message.edit({
            embeds: [{
                color: 0x0099FF,
                title: `🎮 ${actionData.name}`,
                description: `
📅 **Data:** <t:${Math.floor(actionId / 1000)}:F>

👥 **Vagas:** ${actionData.participantes.length}/${actionData.vagas}
🗡️ **Arma do baú:** ${actionData.quantidadeArmas > 0 ? `Sim (${actionData.quantidadeArmas} armas)` : 'Não'}

**Participantes:**
${participantesList}

${actionData.reservas.length > 0 ? `**Reservas:**\n${reservasList}` : ''}`,
                footer: {
                    text: 'Use os botões abaixo para participar ou se retirar da ação!'
                }
            }],
            components: [new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`Participar_${actionId}`)
                        .setLabel('✅ Participar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`Retirar_${actionId}`)
                        .setLabel('❌ Se Retirar')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`Finalizar_${actionId}`)
                        .setLabel('🏆 Finalizar')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`Cancelar_${actionId}`)
                        .setLabel('🚫 Cancelar Ação')
                        .setStyle(ButtonStyle.Danger)
                )]
        });

        // Verifica o status atual do usuário
        const currentIsUserInAction = actionData.participantes.includes(interaction.user.id) || 
                                    actionData.reservas.includes(interaction.user.id);

        await interaction.reply({
            content: currentIsUserInAction 
                ? 'Você está participando desta ação!' 
                : 'Você não está participando desta ação.',
            ephemeral: true
        });
    }

    if(action === 'Finalizar' || action === 'Cancelar'){
        // Remove a mensagem original da ação
        await interaction.message.delete();

        if(action === 'Cancelar'){
            // Envia a mensagem de cancelamento no canal de registro
            const logChannel = interaction.guild.channels.cache.find(c => c.name === '📁⠂𝖱𝖾��𝖺𝗍𝗈́𝗋𝗂𝗈𝗌');
            if(logChannel) {
                await logChannel.send({
                    embeds: [{
                        color: 0xFF0000,
                        title: '🚫 Ação Cancelada',
                        fields: [
                            { name: '🎭 Ação', value: actionData.name, inline: false },
                            { name: '📅 Data', value: `<t:${Math.floor(actionId / 1000)}:F>`, inline: false },
                            { name: '👤 Responsável', value: `<@${actionData.criador}>`, inline: false },
                            { name: '🚫 Cancelada por', value: `<@${interaction.user.id}>`, inline: false },
                            { name: '👥 Participantes', value: actionData.participantes.map(id => `<@${id}>`).join('\n') || 'Nenhum participante', inline: false }
                        ]
                    }]
                });
            }

            delete actions[actionId];
            await interaction.reply({
                content: 'Ação cancelada com sucesso!',
                ephemeral: true
            });
        }

        if(action === 'Finalizar'){
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

            await interaction.reply({
                content: '⚔️ Qual foi o status da ação?',
                components: [select],
                ephemeral: true
            });
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isStringSelectMenu()) return;

    const [_, actionId] = interaction.customId.split('_');
    const actionData = actions[actionId];

    if(!actionData) return interaction.reply({ content: 'Ação não encontrada.', ephemeral: true });

    const status = interaction.values[0];
    const participantes = actionData.participantes.map(id => `<@${id}>`).join('\n') || 'Nenhum participante';
    const participantesSimples = actionData.participantes.map(id => `<@${id}>`).join(' ');
    const armasInfo = actionData.quantidadeArmas > 0 
        ? `Sim (${actionData.quantidadeArmas} armas)` 
        : 'Não';

    // Data formatada
    const data = new Date(parseInt(actionId));
    const dataFormatada = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}/${data.getFullYear().toString().slice(-2)}`;

    // Envia o resultado em um canal separado
    const logChannel = interaction.guild.channels.cache.find(c => c.name === '📁⠂𝖱𝖾𝗅𝖺𝗍𝗈́𝗋𝗂𝗈𝗌');
    const logChannelIlegal = interaction.guild.channels.cache.find(c => c.name === '📁⠂𝖱𝖾𝗅𝖺𝗍𝗈́𝗋𝗂𝗈𝗌-ilegal');

    if(logChannel) {
        await logChannel.send({
            embeds: [{
                color: status === 'vitoria' ? 0x00FF00 : 0xFF0000,
                title: '🎮 Resultado da Ação',
                fields: [
                    { name: '🎭 Ação', value: actionData.name, inline: false },
                    { name: '📅 Data', value: `<t:${Math.floor(actionId / 1000)}:F>`, inline: false },
                    { name: '👤 Responsável', value: `<@${actionData.criador}>`, inline: false },
                    { name: '⚔️ Status', value: status === 'vitoria' ? '🏆 Vitória' : '💀 Derrota', inline: false },
                    { name: '🗡️ Armas do Baú', value: armasInfo, inline: false },
                    { name: '👥 Participantes', value: participantes, inline: false }
                ]
            }]
        });
    }

    if(logChannelIlegal) {
        const participantesFormatados = actionData.participantes
            .map(id => `<@${id}>`)
            .join('\n');

        await logChannelIlegal.send(
`Ação: ${actionData.name}
Data: ${dataFormatada}
Contingente: ${participantesFormatados}
Resultado: ${status === 'vitoria' ? 'Vitória' : 'Derrota'}`
        );
    }

    delete actions[actionId];
    await interaction.reply({
        content: 'Ação finalizada com sucesso!',
        ephemeral: true
    });
});

client.login(process.env.TOKEN);