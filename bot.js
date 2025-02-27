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

        const armaInput = new TextInputBuilder()
            .setCustomId('arma_acao')
            .setLabel('Foi pega arma do baú?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Digite sim ou não')
            .setRequired(true);

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
        const pegouArma = interaction.fields.getTextInputValue('arma_acao').toLowerCase() === 'sim';

        if(isNaN(vagas)) {
            return interaction.reply({ content: 'Número de vagas inválido!', ephemeral: true });
        }

        const actionId = Date.now();
        actions[actionId] = {
            name: actionName,
            vagas: vagas,
            pegouArma: pegouArma,
            participantes: [],
            reservas: [],
        };

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

        await interaction.reply({
            embeds: [{
                color: 0x0099FF,
                title: '🎮 Nova Ação Criada',
                fields: [
                    { name: '🎭 Ação', value: actionName, inline: true },
                    { name: '📅 Data', value: `<t:${Math.floor(actionId / 1000)}:F>`, inline: true },
                    { name: '👥 Vagas', value: `${vagas}`, inline: true },
                    { name: '🗡️ Arma do baú', value: pegouArma ? 'Sim' : 'Não', inline: true }
                ]
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