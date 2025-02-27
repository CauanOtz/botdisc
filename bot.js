require('dotenv').config();
const { Client, Intents, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MEMBERS
    ]
});

const actions = {}; //Armazenar as ações que estão ativas no momento

client.on('ready', () => {
    console.log('Bot está funcionando autenticado e pronto para uso!');
});

client.on('messageCreate', async (message) => {
    if(message.channel.name !== 'iniciar-ação' || message.author.bot) return;

    const args = message.content.split('\n');
    if(args.length < 3){
        return message.reply('Formato inválido. Use: \n```Ação: NomeDaAção \n Vagas: NúmeroDeVagas \nFoi pega arma do baú? (sim/não)```');
    }

    const actionName = args[0].split(':')[1].trim();
    const vagas = parseInt(args[1].split(': ')[1], 10);
    const pegouArma = args[2].split(': ')[1].trim().toLowerCase() === 'sim';

    if(isNaN(vagas)) return message.reply('Número de vagas inválido. Use um número válido.');

    const actionId = Date.now();
    actions[actionId] = {
        name: actionName,
        vagas: vagas,
        pegouArma: pegouArma,
        participantes: [],
        reservas: [],
    };

    const buttons = new MessageActionRow()
        .addComponents(
            new MessageButton().setCustomId(`Participar_${actionId}`).setLabel('✅ Participar').setStyle('SUCCESS'),
            new MessageButton().setCustomId(`Cancelar_${actionId}`).setLabel('❌ Cancelar').setStyle('DANGER'),
        );
    
    await message.channel.send({
        content: `🎭 **Ação:** ${actionName}\n📅 **Data:** <t:${Math.floor(actionId / 1000)}:d>\n👥 **Vagas disponíveis:** ${vagas}\n🗡️ **Arma do baú:** ${pegouArma ? 'Sim' : 'Não'}`,
        components: [buttons],
    });
});

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

        const select = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
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
        content: `🎭 **Ação:** ${actionData.name}\n📅 **Data:** <t:${Math.floor(actionId / 1000)}:d>\n👥 **Participantes:** ${participantes}\n⚔️ **Status:** ${status === 'vitoria' ? '🏆 Vitória' : '💀 Derrota'}`
    });

    delete actions[actionId];
});

client.login(process.env.TOKEN);