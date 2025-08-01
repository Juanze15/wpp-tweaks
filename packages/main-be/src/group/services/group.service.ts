import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Group } from '../models/group.model';
import { DeleteResult, FilterQuery, Model, PipelineStage, UpdateWriteOpResult } from 'mongoose';
import { GroupMember } from '../models/group-member.model';
import { BulkWriteResult } from 'mongodb';

@Injectable()
export class GroupService {
  constructor(
    @InjectModel(Group.NAME) private readonly _groupModel: Model<Group>,
    @InjectModel(GroupMember.NAME) private readonly _groupMemberModel: Model<GroupMember>,
  ) {}

  upsertGroup(group: Group): Promise<Group> {
    return this._groupModel.findOneAndUpdate({ jid: group.jid }, group, { upsert: true, new: true }).exec();
  }

  getGroupByJid(jid: string): Promise<Group> {
    return this._groupModel.findOne({ jid }).exec();
  }

  deleteGroup(jid: string): Promise<Group> {
    return this._groupModel.findOneAndDelete({ jid }).exec();
  }

  updateGroup(jid: string, group: Group): Promise<Group> {
    return this._groupModel.findOneAndUpdate({ jid }, group, { new: true }).exec();
  }

  getGroups(): Promise<Group[]> {
    return this._groupModel.find().exec();
  }
  
  getGroupMembers(groupJid: string, onlyAdmins?: boolean): Promise<GroupMember[]> {
    const query = { groupJid };

    if (onlyAdmins) {
      query['isAdmin'] = true;
    }

    return this._groupMemberModel.find(query).exec();
  }

  getNonAdminMembers(groupJid: string): Promise<GroupMember[]> {
    return this._groupMemberModel.find({ groupJid, isAdmin: false }).exec();
  }

  upsertGroupMembers(members: GroupMember[]): Promise<BulkWriteResult> {
    return this._groupMemberModel.bulkWrite(members.map(member => ({
      updateOne: {
        filter: { jid: member.jid, groupJid: member.groupJid },
        update: { $set: member },
        upsert: true,
      },
    })));
  }

  increaseGroupMemberMessagesCount(groupJid: string, jid: string): Promise<GroupMember> {
    return this._groupMemberModel.findOneAndUpdate({ groupJid, jid }, { $inc: { messagesCount: 1, totalMessagesCount: 1 }, $set: { active: true } }, { new: true }).exec();
  }
  
  removeGroupMembers(groupJid: string, participants: string[]): Promise<DeleteResult> {
    return this._groupMemberModel.deleteMany({ groupJid, jid: { $in: participants } }).exec();
  }

  updateGroupMember(jid: string, member: GroupMember): Promise<GroupMember> {
    return this._groupMemberModel.findOneAndUpdate({ jid }, member, { new: true }).exec();
  }

  async updateGroupMembers(filter: FilterQuery<GroupMember>, updatePipeline: PipelineStage[]): Promise<UpdateWriteOpResult> {
    return await this._groupMemberModel.updateMany(filter, updatePipeline);
  }

  getGroupMember(jid: string, groupJid: string): Promise<GroupMember> {
    return this._groupMemberModel.findOne({ jid, groupJid }).exec();
  }

  queryGroupMembers(pipeline: PipelineStage[]): Promise<GroupMember[]> {
    return this._groupMemberModel.aggregate(pipeline).exec();
  }
}
