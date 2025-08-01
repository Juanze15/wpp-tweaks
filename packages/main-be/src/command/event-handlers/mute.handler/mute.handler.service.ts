import { Injectable } from '@nestjs/common';
import { Commands } from '../../constants/command.constants';
import { OnEvent } from '@nestjs/event-emitter';
import { CommandHandler, CommandPayload } from '../../interfaces/command.interfaces';
import { GroupService } from '../../../group/services/group.service';
import { GroupMember } from '../../../group/models/group-member.model';
import { getContextInfo } from '../../../whatsapp-client/event-handlers/message-handler/utils/message-handler.util';

@Injectable()
export class MuteHandlerService implements CommandHandler {
  constructor(
    private readonly _groupService: GroupService,
  ) { }

  @OnEvent(Commands.MUTE)
  handle(payload: CommandPayload) {
    this.handleMuteUnmute(payload, true);
  }

  @OnEvent(Commands.UNMUTE)
  handleUnmute(payload: CommandPayload) {
    this.handleMuteUnmute(payload, false);
  }

  private async handleMuteUnmute(payload: CommandPayload, mute: boolean) {
    const {
      groupJid,
      WaMessage,
      client,
      messageType,
      messageContent,
    } = payload;

    const mentionedJids = getContextInfo(messageContent, messageType)?.mentionedJid?.filter(jid => jid !== client._userId);
    const groupAdmins = await this._groupService.getGroupMembers(groupJid, true);
    const filteredMentionedJids = mentionedJids?.filter(jid => !groupAdmins.some(admin => admin.jid === jid));

    if (filteredMentionedJids?.length !== mentionedJids?.length) {
      client._wppSocket.sendMessage(
        groupJid,
        { text: 'You cannot mute/unmute an admin.' },
        { quoted: WaMessage }
      );
    }

    if (!filteredMentionedJids?.length) {
      client._wppSocket.sendMessage(
        groupJid,
        { text: `Please mention the users you want to ${mute ? 'mute' : 'unmute'} after the command.` },
        { quoted: WaMessage }
      );
      return;
    }

    if(filteredMentionedJids?.length) {
      await this.updateUserMuteStatus(groupJid, filteredMentionedJids, mute);
  
      await client._wppSocket.sendMessage(
        groupJid,
        { text: mute ? 'Muted!' : 'Unmuted!' },
        { quoted: WaMessage }
      );
    }


    return;
  }

  private updateUserMuteStatus(groupJid: string, mentionedJids: string[], mute: boolean) {
    const members = mentionedJids.map(jid => ({
      jid,
      groupJid,
      muted: mute,
    }));

    return this._groupService.upsertGroupMembers(members as GroupMember[]);
  }
}

